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
    io.on("connection", async (socket) => {
        logger.info(`user connected with socketID : ${socket.id} `)
        // --- JOIN DOCUMENT ---
        socket.on("joinDoc", async (documentId, userId) => {
            // create doc entry if not exist
            if (!presenceStore.has(documentId)) {
                presenceStore.set(documentId, new Map());
                const docUsers = await presenceStore.get(documentId);
                docUsers.set("users", [])
                logger.info("created new doc entry")
            }

            const docUsers = await presenceStore.get(documentId);

            // Add this client
            let ls = docUsers.get("users")
            ls.push({
                "clientId": socket.id,
                userId,
                lastActiveAt: Date.now(),
            })
            docUsers.set("users", ls);

            // join Socket.IO room
            await socket.join(documentId);

            logger.info(`user : ${userId} joined the room of doc : ${documentId}`)
            // send updated presence list
            await emitPresenceUpdate(io, documentId);
        });

        // --- HEARTBEAT ---
        socket.on("heartbeat", async (documentId) => {
            const docUsers = await presenceStore.get(documentId);
            if (!docUsers) {
                logger.info(`document not found with id : ${documentId}`)
            };
            let present = 0;
            let ls = docUsers.get("users")
            for (let x of ls) {
                if (x.clientId == socket.id) {
                    present = 1;
                    x.lastActiveAt = Date.now()
                }
            }
            if (present == 0) {
                logger.info(`client : ${socket.id} not found`)
            }
            // no emit needed; heartbeat only updates timestamp
        });

        // --- LEAVE DOCUMENT ---
        socket.on("leaveDoc", (documentId) => {
            removeClientFromDoc(documentId, socket.id, io);
            socket.leave(documentId);
            // emitPresenceUpdate(io, documentId);
        });

        // --- DISCONNECT CLEANUP ---
        socket.on("disconnect", () => {
            cleanupClient(socket.id, io);

        });
    });
}

export default registerPresenceSocket;