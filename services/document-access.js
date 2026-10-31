import mongoose from "mongoose";
import Userdocument from "../models/document.js";

export function visibleDocumentsFilter(userId) {
    // Fail closed even when called outside authenticated routes.
    if (!mongoose.isObjectIdOrHexString(userId)) throw new Error("Authenticated user ID required");
    return { $or: [{ createdBy: userId }, { "access.view": userId }, { "access.edit": userId }] };
}

export function createDocumentAccessService(documents = Userdocument) {
    return {
        list(userId) {
            return documents.find(visibleDocumentsFilter(userId));
        },
        aiContext(userId) {
            // Only document text is sent to the model, never access lists or requests.
            return documents.find(visibleDocumentsFilter(userId)).select("_id title content").lean();
        },
        async search(userId, query, searchClient) {
            const filter = visibleDocumentsFilter(userId);
            const ids = (await documents.find(filter).select("_id").lean()).map(doc => String(doc._id));
            if (!ids.length) return [];
            const result = await searchClient.search({
                index: "documents",
                query: {
                    bool: {
                        filter: [{ ids: { values: ids } }],
                        must: [{ multi_match: {
                            query, fields: ["title", "content", "tags"], fuzziness: "AUTO"
                        } }]
                    }
                }
            });
            const hits = result.hits.hits;
            // Recheck MongoDB so a revocation during the search also removes the hit.
            const hitIds = hits.map(hit => hit._id).filter(value => mongoose.isObjectIdOrHexString(value));
            if (!hitIds.length) return [];
            const current = await documents.find({ ...filter, _id: { $in: hitIds } }).select("_id").lean();
            const allowed = new Set(current.map(doc => String(doc._id)));
            return hits.filter(hit => allowed.has(hit._id));
        }
    };
}

export const documentAccess = createDocumentAccessService();
