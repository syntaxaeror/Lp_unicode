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
    if (!docUsers) {
        console.log("document not found");
        return
    };

    const payload = {
        documentId,
        "users": await docUsers.get("users")
    };

    console.log(payload);

    await io.to(documentId).emit("presence:update", payload);
}

async function removeClientFromDoc(documentId, clientId, io) {
    const docUsers = await presenceStore.get(documentId);
    if (!docUsers) return;
    let usersarr = await docUsers.get("users");
    if (!usersarr) return;
    usersarr = usersarr.filter(item => item.clientId !== clientId);
    console.log("updated :", usersarr);
    await docUsers.set("users", usersarr)

    if (usersarr.length === 0) {
        presenceStore.delete(documentId);
        console.log(presenceStore);
    }
    else {
        emitPresenceUpdate(io, documentId)
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