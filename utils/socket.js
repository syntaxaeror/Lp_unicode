import { presenceStore } from "./presence_store.js";
import pino from "pino";
import { emitPresenceUpdate, cleanupClient, removeClientFromDoc } from "../controllers/socketHandler.js"

const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
    }
});

async function registerPresenceSocket(io) {

    io.on("connection", (socket) => {
        console.log("Connected:", socket.id);

        // --- JOIN DOCUMENT ---
        socket.on("joinDoc", ({ documentId, userId }) => {

            // create doc entry if not exist
            if (!presenceStore.has(documentId)) {
                presenceStore.set(documentId, new Map());
            }

            const docUsers = presenceStore.get(documentId);

            // Add this client
            docUsers.set(socket.id, {
                userId,
                lastActiveAt: Date.now(),
            });

            // join Socket.IO room
            socket.join(documentId);

            // send updated presence list
            emitPresenceUpdate(io, documentId);
        });

        // --- HEARTBEAT ---
        socket.on("heartbeat", ({ documentId }) => {
            const docUsers = presenceStore.get(documentId);
            if (!docUsers) return;

            if (docUsers.has(socket.id)) {
                docUsers.get(socket.id).lastActiveAt = Date.now();
            }

            // no emit needed; heartbeat only updates timestamp
        });

        // --- LEAVE DOCUMENT ---
        socket.on("leaveDoc", ({ documentId }) => {
            removeClientFromDoc(documentId, socket.id);
            socket.leave(documentId);
            emitPresenceUpdate(io, documentId);
        });

        // --- DISCONNECT CLEANUP ---
        socket.on("disconnect", () => {
            cleanupClient(socket.id, io);
        });
    });
}

export default registerPresenceSocket;