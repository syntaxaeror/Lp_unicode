import { presenceStore } from "../utils/presence_store.js";
import pino from "pino";

const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
    }
});


async function emitPresenceUpdate(io, documentId) {
    const docUsers = await presenceStore.get(documentId);
    if (!docUsers) return;

    const payload = {
        documentId,
        users: [...docUsers.entries()].map(([clientId, data]) => ({
            clientId,
            userId: data.userId,
            lastActiveAt: data.lastActiveAt,
        }))
    };

    await io.to(documentId).emit("presence:update", payload);
}

async function removeClientFromDoc(documentId, clientId) {
    const docUsers = await presenceStore.get(documentId);
    if (!docUsers) return;

    await docUsers.delete(clientId);

    if (docUsers.size === 0) {
        presenceStore.delete(documentId);
    }
}

async function cleanupClient(clientId, io) {
    for (const [documentId, docUsers] of presenceStore.entries()) {
        if (docUsers.has(clientId)) {
            docUsers.delete(clientId);
            emitPresenceUpdate(io, documentId);

            if (docUsers.size === 0) {
                presenceStore.delete(documentId);
            }
        }
    }
}

export { emitPresenceUpdate, cleanupClient, removeClientFromDoc };