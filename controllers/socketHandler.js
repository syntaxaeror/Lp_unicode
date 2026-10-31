import { presenceStore } from "../utils/presence_store.js";

export function emitPresenceUpdate(io, documentId) {
    io.to(documentId).emit("presence:update", {
        documentId, users: presenceStore.get(documentId)?.get("users") ?? []
    });
}

export function removeClientFromDoc(documentId, clientId, io) {
    const docUsers = presenceStore.get(documentId);
    if (!docUsers) return;
    const users = docUsers.get("users").filter(user => user.clientId !== clientId);
    if (users.length) docUsers.set("users", users);
    else presenceStore.delete(documentId);
    emitPresenceUpdate(io, documentId);
}

export function cleanupClient(clientId, io) {
    for (const documentId of presenceStore.keys()) removeClientFromDoc(documentId, clientId, io);
}

export async function evictUserFromDocument(io, documentId, userId) {
    if (!io) return;
    // Inspect room membership as well as presence to include joins still in progress.
    const sockets = await io.in(documentId).fetchSockets();
    for (const socket of sockets) {
        if (socket.data.user?.id !== String(userId)) continue;
        await socket.leave(documentId);
        removeClientFromDoc(documentId, socket.id, io);
        socket.emit("document:accessRevoked", { documentId });
    }
}
