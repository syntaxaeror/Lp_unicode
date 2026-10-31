import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import registerPresenceSocket from "../utils/socket.js";
import { authenticateSocket, authorizationfn, verifySelfUser } from "../middleware/authmiddleware.js";
import { evictUserFromDocument } from "../controllers/socketHandler.js";
import { presenceStore } from "../utils/presence_store.js";

process.env.JWT_ACESS_SECRET_KEY = "socket-tests-only-secret";
const id = () => new mongoose.Types.ObjectId().toString();
const userId = id();
const docId = id();
const token = (payload = { id: userId }, options = { expiresIn: "1m" }) =>
    jwt.sign(payload, process.env.JWT_ACESS_SECRET_KEY, options);

function fixture(loadDocument, accessToken = token()) {
    const handlers = {};
    const events = [];
    const socket = {
        id: "socket-1", connected: true, data: {}, rooms: new Set(),
        handshake: { auth: { token: accessToken }, headers: {} },
        on(event, handler) { handlers[event] = handler; },
        emit(event, payload) { events.push({ event, payload }); },
        async join(room) { this.rooms.add(room); },
        async leave(room) { this.rooms.delete(room); },
        disconnect() { this.connected = false; handlers.disconnect?.(); }
    };
    const io = {
        use(handler) { this.authenticate = handler; },
        on(event, handler) { this.connect = handler; },
        to(room) { return { emit: (event, payload) => events.push({ room, event, payload }) }; },
        in(room) { return { fetchSockets: async () => socket.rooms.has(room) ? [socket] : [] }; }
    };
    registerPresenceSocket(io, loadDocument);
    let error;
    io.authenticate(socket, err => { error = err; });
    if (!error) io.connect(socket);
    return { io, socket, handlers, events, error };
}

test("socket authentication rejects missing, forged, expired, and identity-free tokens", () => {
    for (const value of [undefined, "forged", token({ id: userId }, { expiresIn: -1 }),
        token({ email: "someone@example.test" }), token({ id: userId }, {})]) {
        const socket = { data: {}, handshake: { auth: { token: value } } };
        let error;
        authenticateSocket(socket, err => { error = err; });
        assert.ok(error);
        assert.equal(socket.data.user, undefined);
    }
});

test("HTTP and socket authentication derive the same signed identity", () => {
    const accessToken = token();
    const req = { headers: { authorization: `Bearer ${accessToken}` }, body: { userId: id() } };
    authorizationfn(req, { status() { assert.fail("Should authenticate"); } }, () => {});
    const socket = { data: {}, handshake: { headers: req.headers } };
    authenticateSocket(socket, error => assert.equal(error, undefined));
    assert.equal(req.user.id, userId);
    assert.deepEqual(req.user, socket.data.user);
});

test("join ignores supplied identity, deduplicates presence, and disconnect cleans up", async () => {
    const f = fixture(async () => ({ createdBy: userId }));
    try {
        await f.handlers.joinDoc(docId, id());
        await f.handlers.joinDoc(docId, id());
        const users = presenceStore.get(docId).get("users");
        assert.equal(users.length, 1);
        assert.equal(users[0].userId, userId);
        assert.ok(f.socket.rooms.has(docId));
    } finally { f.socket.disconnect(); }
    assert.equal(presenceStore.has(docId), false);
});

test("outsiders and malformed document IDs cannot join", async () => {
    let reads = 0;
    const f = fixture(async () => { reads++; return { createdBy: id() }; });
    try {
        let result;
        await f.handlers.joinDoc("invalid", value => { result = value; });
        assert.equal(result.status, 404);
        assert.equal(reads, 0);
        await f.handlers.joinDoc(docId, value => { result = value; });
        assert.equal(result.status, 404);
        assert.equal(f.socket.rooms.size, 0);
        assert.equal(presenceStore.has(docId), false);
    } finally { f.socket.disconnect(); }
});

test("viewers and editors can join, and revocation evicts sockets immediately", async () => {
    for (const role of ["view", "edit"]) {
        let doc = { createdBy: id(), access: { [role]: [userId] } };
        const f = fixture(async () => doc);
        try {
            await f.handlers.joinDoc(docId);
            assert.ok(f.socket.rooms.has(docId));
            doc = { createdBy: id() };
            await evictUserFromDocument(f.io, docId, userId);
            assert.equal(f.socket.rooms.has(docId), false);
            assert.equal(presenceStore.has(docId), false);
            assert.ok(f.events.some(event => event.event === "document:accessRevoked"));
            await f.handlers.joinDoc(docId);
            assert.equal(f.socket.rooms.has(docId), false);
        } finally { f.socket.disconnect(); }
    }
});

test("heartbeat rechecks permissions and evicts revoked users", async () => {
    let doc = { createdBy: userId };
    const f = fixture(async () => doc);
    try {
        await f.handlers.joinDoc(docId);
        doc = null;
        await f.handlers.heartbeat(docId);
        assert.equal(f.socket.rooms.has(docId), false);
        assert.equal(presenceStore.has(docId), false);
    } finally { f.socket.disconnect(); }
});

test("revocation during join cannot leave the socket in a room", async () => {
    let reads = 0;
    const f = fixture(async () => ++reads === 1 ? { createdBy: userId } : null);
    try {
        await f.handlers.joinDoc(docId);
        assert.equal(f.socket.rooms.size, 0);
        assert.equal(presenceStore.has(docId), false);
    } finally { f.socket.disconnect(); }
});

test("database failures are reported and do not join rooms", async () => {
    const f = fixture(async () => { throw new Error("Database down"); });
    try {
        let result;
        await f.handlers.joinDoc(docId, value => { result = value; });
        assert.equal(result.status, 500);
        assert.equal(f.socket.rooms.size, 0);
    } finally { f.socket.disconnect(); }
});

test("expired sessions disconnect before processing further events", async () => {
    const f = fixture(async () => ({ createdBy: userId }));
    await f.handlers.joinDoc(docId);
    f.socket.data.user.exp = 0;
    await f.handlers.heartbeat(docId);
    assert.equal(f.socket.connected, false);
    assert.equal(presenceStore.has(docId), false);
});

test("self-account guard rejects another account before upload or deletion", () => {
    for (const [target, expected] of [[userId, true], [id(), false]]) {
        let called = false;
        let status;
        verifySelfUser({ user: { id: userId }, params: { id: target } }, {
            status(value) { status = value; return this; }, json() {}
        }, () => { called = true; });
        assert.equal(called, expected);
        if (!expected) assert.equal(status, 403);
    }
});
