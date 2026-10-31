import mongoose from "mongoose";
import Userdocument from "../models/document.js";
import { canView } from "../middleware/verifymiddleware.js";
import { authenticateSocket } from "../middleware/authmiddleware.js";
import { presenceStore } from "./presence_store.js";
import { emitPresenceUpdate, cleanupClient, removeClientFromDoc } from "../controllers/socketHandler.js";

export default function registerPresenceSocket(io, loadDocument = id => Userdocument.findById(id)) {
    io.use(authenticateSocket);
    io.on("connection", socket => {
        const user = socket.data.user;
        const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(0, user.exp * 1000 - Date.now()));
        expiryTimer.unref?.();
        let queue = Promise.resolve();
        const active = () => socket.connected && Date.now() < user.exp * 1000;
        const respond = (ack, result) => {
            if (typeof ack === "function") ack(result);
            else if (!result.ok) socket.emit("document:error", result);
        };
        // Serialize operations on this connection so a delayed join cannot undo a leave.
        function onEvent(event, handler) {
            socket.on(event, (documentId, ...args) => {
                const ack = typeof args.at(-1) === "function" ? args.at(-1) : undefined;
                queue = queue.then(async () => {
                    if (!active()) { socket.disconnect(true); return; }
                    if (!mongoose.isObjectIdOrHexString(documentId)) {
                        respond(ack, { ok: false, status: 404, message: "Document not found" });
                        return;
                    }
                    await handler(documentId.toLowerCase(), ack);
                }).catch(() => respond(ack, { ok: false, status: 500, message: "Document operation failed" }));
                return queue;
            });
        }
        async function checkAccess(documentId, ack) {
            const doc = await loadDocument(documentId);
            if (!active()) return false;
            if (!doc || !canView(doc, user.id)) {
                await socket.leave(documentId);
                removeClientFromDoc(documentId, socket.id, io);
                respond(ack, { ok: false, status: 404, message: "Document not found" });
                return false;
            }
            return true;
        }
        onEvent("joinDoc", async (documentId, ack) => {
            if (!await checkAccess(documentId, ack)) return;
            await socket.join(documentId);
            // Recheck after joining to handle access revoked during the first lookup.
            if (!await checkAccess(documentId, ack)) return;
            if (!presenceStore.has(documentId)) presenceStore.set(documentId, new Map([["users", []]]));
            const users = presenceStore.get(documentId).get("users");
            if (!users.some(entry => entry.clientId === socket.id)) {
                users.push({ clientId: socket.id, userId: user.id, lastActiveAt: Date.now() });
            }
            emitPresenceUpdate(io, documentId);
            respond(ack, { ok: true });
        });
        onEvent("heartbeat", async (documentId, ack) => {
            if (!await checkAccess(documentId, ack)) return;
            const entry = presenceStore.get(documentId)?.get("users").find(item => item.clientId === socket.id);
            if (!entry) { respond(ack, { ok: false, status: 403, message: "Join the document first" }); return; }
            entry.lastActiveAt = Date.now();
            respond(ack, { ok: true });
        });
        onEvent("leaveDoc", async (documentId, ack) => {
            await socket.leave(documentId);
            removeClientFromDoc(documentId, socket.id, io);
            respond(ack, { ok: true });
        });
        socket.on("disconnect", () => {
            clearTimeout(expiryTimer);
            cleanupClient(socket.id, io);
        });
    });
}
