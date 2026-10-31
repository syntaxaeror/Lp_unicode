import client from "../config/elasticsearch.js";
import { documentAccess } from "../services/document-access.js";

export default async function searchDocs(req, res, next) {
    const { query } = req.body ?? {};
    if (typeof query !== "string" || !query.trim()) {
        return res.status(400).json({ message: "A non-empty query string is required" });
    }
    try {
        const results = await documentAccess.search(req.user.id, query.trim(), client);
        return res.status(200).json({ results });
    } catch (error) {
        return next(error);
    }
}
