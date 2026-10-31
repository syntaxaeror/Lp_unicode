import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createDocumentAccessService, visibleDocumentsFilter } from "../services/document-access.js";
import { createChatbot } from "../controllers/chatController.js";

const id = () => new mongoose.Types.ObjectId().toString();
const user = id();
const other = id();
const makeDoc = (createdBy, access = {}) => ({ _id: id(), createdBy, access,
    title: "Title", content: "Content", requests: [{ user: other, status: "pending" }] });

// Small query adapter keeps these tests independent of external services.
function database(rows) {
    const queries = [];
    return { queries, find(filter) {
        queries.push(filter);
        let fields;
        const execute = () => rows.filter(doc => filter.$or.some(clause => {
            const [key, value] = Object.entries(clause)[0];
            if (key === "createdBy") return doc.createdBy === value;
            return (doc.access[key.split(".")[1]] ?? []).includes(value);
        }) && (!filter._id || filter._id.$in.includes(doc._id)))
            .map(doc => fields ? Object.fromEntries(fields.split(" ")
                .filter(field => field in doc).map(field => [field, doc[field]])) : doc);
        return {
            select(value) { fields = value; return this; },
            lean() { return Promise.resolve(execute()); },
            then(resolve, reject) { return Promise.resolve(execute()).then(resolve, reject); }
        };
    } };
}

test("visibility filter requires a valid signed-in identity", () => {
    for (const invalid of [undefined, null, "", {}, "invalid"]) {
        assert.throws(() => visibleDocumentsFilter(invalid));
    }
    assert.deepEqual(visibleDocumentsFilter(user), { $or: [
        { createdBy: user }, { "access.view": user }, { "access.edit": user }
    ] });
});

test("lists and AI context include owned, viewed, and edit-only documents", async () => {
    const rows = [makeDoc(user), makeDoc(other, { view: [user] }),
        makeDoc(other, { edit: [user] }), makeDoc(other)];
    const service = createDocumentAccessService(database(rows));
    const expected = rows.slice(0, 3).map(doc => doc._id);
    assert.deepEqual((await service.list(user)).map(doc => doc._id), expected);
    const context = await service.aiContext(user);
    assert.deepEqual(context.map(doc => doc._id), expected);
    assert.ok(context.every(doc => Object.keys(doc).sort().join() === "_id,content,title"));
});

test("search filters by MongoDB IDs and removes unauthorized hits", async () => {
    const rows = [makeDoc(user), makeDoc(other, { edit: [user] }), makeDoc(other)];
    const db = database(rows);
    const service = createDocumentAccessService(db);
    const hits = rows.map(doc => ({ _id: doc._id, _source: { title: doc.title } }));
    const results = await service.search(user, "example", { async search(request) {
        assert.deepEqual(request.query.bool.filter, [{ ids: { values: rows.slice(0, 2).map(doc => doc._id) } }]);
        assert.equal(request.query.bool.must[0].multi_match.query, "example");
        // Deliberately return an unauthorized hit too; the final MongoDB check rejects it.
        return { hits: { hits } };
    } });
    assert.deepEqual(results, hits.slice(0, 2));
    assert.equal(db.queries.length, 2);
});

test("revocations take effect during search and on subsequent list/AI requests", async () => {
    const doc = makeDoc(other, { view: [user], edit: [user] });
    const service = createDocumentAccessService(database([doc]));
    assert.equal((await service.list(user)).length, 1);
    const results = await service.search(user, "example", { async search() {
        doc.access = {};
        return { hits: { hits: [{ _id: doc._id, _source: { content: "Revoked" } }] } };
    } });
    assert.deepEqual(results, []);
    assert.deepEqual(await service.list(user), []);
    assert.deepEqual(await service.aiContext(user), []);
});

test("no permissions returns empty results without querying Elasticsearch", async () => {
    const service = createDocumentAccessService(database([makeDoc(other)]));
    assert.deepEqual(await service.search(user, "example", {
        search() { assert.fail("Must not search without authorized IDs"); }
    }), []);
});

test("MongoDB lookup failures fail closed before Elasticsearch", async () => {
    const service = createDocumentAccessService({ find() { throw new Error("DB unavailable"); } });
    await assert.rejects(service.search(user, "example", {
        search() { assert.fail("Must not search after a failed authorization lookup"); }
    }), /DB unavailable/);
});

function response() {
    return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
}

test("chat reloads authorized context for each question and ignores submitted context/identity", async () => {
    const doc = makeDoc(other, { edit: [user] });
    const service = createDocumentAccessService(database([doc]));
    const calls = [];
    const chatbot = createChatbot(service, async (message, context) => {
        calls.push({ message, context }); return "Answer";
    });
    const req = { user: { id: user }, body: {
        message: "Question", userId: other, documents: [{ content: "Injected" }]
    } };
    let res = response();
    await chatbot(req, res, error => assert.fail(error));
    assert.deepEqual(res.body, { reply: "Answer" });
    assert.deepEqual(calls[0].context, [{ _id: doc._id, title: "Title", content: "Content" }]);
    doc.access = {};
    res = response();
    await chatbot(req, res, error => assert.fail(error));
    assert.deepEqual(calls[1].context, []);
});

test("chat validates input and never calls the model after context lookup fails", async () => {
    const chatbot = createChatbot({ aiContext() { throw new Error("DB down"); } },
        () => assert.fail("No AI call allowed"));
    for (const message of [undefined, " ", {}, 1]) {
        const res = response();
        await chatbot({ user: { id: user }, body: { message } }, res, error => assert.fail(error));
        assert.equal(res.code, 400);
    }
    let failure;
    await chatbot({ user: { id: user }, body: { message: "Question" } }, response(), error => { failure = error; });
    assert.equal(failure.message, "DB down");
});
