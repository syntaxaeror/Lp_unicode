import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { requireDocumentPermission, validateDocumentUpdate } from "../middleware/verifymiddleware.js";

const ids = Object.fromEntries(["owner", "editor", "viewer", "outsider", "document"]
    .map(role => [role, new mongoose.Types.ObjectId().toString()]));
const document = {
    createdBy: new mongoose.Types.ObjectId(ids.owner),
    access: {
        edit: [new mongoose.Types.ObjectId(ids.editor)],
        view: [new mongoose.Types.ObjectId(ids.viewer)]
    }
};

function invoke(middleware, req) {
    const result = { next: false };
    const res = {
        status(code) { result.status = code; return this; },
        json(body) { result.body = body; return this; }
    };
    return Promise.resolve(middleware(req, res, error => {
        result.next = true;
        result.error = error;
    })).then(() => result);
}

for (const [permission, allowed] of Object.entries({
    view: ["owner", "editor", "viewer"], edit: ["owner", "editor"], owner: ["owner"]
})) {
    for (const role of ["owner", "editor", "viewer", "outsider"]) {
        test(`${role} requesting ${permission} permission`, async () => {
            const req = { user: { id: ids[role] }, params: { doc_id: ids.document } };
            const result = await invoke(requireDocumentPermission(permission, async () => document), req);
            if (allowed.includes(role)) {
                assert.equal(result.next, true);
                assert.equal(req.document, document);
            } else {
                assert.equal(result.next, false);
                assert.equal(result.status, role === "outsider" ? 404 : 403);
                assert.equal(req.document, undefined);
            }
        });
    }
}

test("missing identity and malformed IDs fail before loading", async () => {
    const middleware = requireDocumentPermission("view", () => assert.fail("Unexpected database read"));
    assert.equal((await invoke(middleware, { params: { doc_id: ids.document } })).status, 401);
    assert.equal((await invoke(middleware, { user: { id: ids.owner }, params: { doc_id: "invalid" } })).status, 404);
});

test("missing documents return 404 and database failures reach the error handler", async () => {
    const req = { user: { id: ids.owner }, params: { doc_id: ids.document } };
    assert.equal((await invoke(requireDocumentPermission("view", async () => null), req)).status, 404);
    const error = new Error("Database unavailable");
    assert.equal((await invoke(requireDocumentPermission("view", async () => { throw error; }), req)).error, error);
});

test("updates reject protected fields, operators, invalid values, and empty bodies", async () => {
    const bodies = [undefined, null, [], {}, { title: 1 }, { content: { $ne: null } },
        ...["createdBy", "access", "requests", "version", "lastEditedBy", "$set", "$unset"]
            .map(field => ({ title: "Valid title", [field]: "injected" }))];
    for (const body of bodies) {
        const req = { user: { id: ids.editor }, body };
        const result = await invoke(validateDocumentUpdate, req);
        assert.equal(result.status, 400);
        assert.equal(result.next, false);
        assert.equal(req.documentUpdate, undefined);
    }
});

test("valid updates set editor identity on the server", async () => {
    const req = { user: { id: ids.editor }, body: { title: "New title", content: "" } };
    assert.equal((await invoke(validateDocumentUpdate, req)).next, true);
    assert.deepEqual(req.documentUpdate, { title: "New title", content: "", lastEditedBy: ids.editor });
});

test("permission and update validation gates stop denied operations", async () => {
    let writes = 0;
    const authorize = requireDocumentPermission("edit", async () => document);
    for (const [role, body, status] of [
        ["outsider", { title: "Denied" }, 404],
        ["viewer", { title: "Denied" }, 403],
        ["editor", { access: { edit: [ids.outsider] } }, 400],
        ["editor", { content: "Allowed" }, undefined]
    ]) {
        const req = { user: { id: ids[role] }, params: { doc_id: ids.document }, body };
        let result = await invoke(authorize, req);
        if (result.next) result = await invoke(validateDocumentUpdate, req);
        if (result.next) writes++;
        assert.equal(result.status, status);
    }
    assert.equal(writes, 1);
});
