import mongoose from "mongoose";
import Userdocument from "../models/document.js";

const sameUser = (value, userId) => value != null && userId != null &&
    String(value._id ?? value) === String(userId);

export const isOwner = (doc, userId) => sameUser(doc.createdBy, userId);
export const canEdit = (doc, userId) => isOwner(doc, userId) ||
    (doc.access?.edit ?? []).some(id => sameUser(id, userId));
export const canView = (doc, userId) => canEdit(doc, userId) ||
    (doc.access?.view ?? []).some(id => sameUser(id, userId));

// Loading is injectable so permissions can be tested without a database.
export function requireDocumentPermission(permission, loadDocument = id => Userdocument.findById(id)) {
    const checks = { view: canView, edit: canEdit, owner: isOwner };
    if (!checks[permission]) throw new Error("Unknown document permission");
    return async (req, res, next) => {
        if (!req.user?.id) return res.status(401).json({ message: "Authentication required" });
        if (!mongoose.isObjectIdOrHexString(req.params.doc_id)) {
            return res.status(404).json({ message: "Document not found" });
        }
        try {
            const doc = await loadDocument(req.params.doc_id);
            if (!doc || !canView(doc, req.user.id)) {
                return res.status(404).json({ message: "Document not found" });
            }
            if (!checks[permission](doc, req.user.id)) {
                return res.status(403).json({ message: "Insufficient document permission" });
            }
            req.document = doc;
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

// Reject operators and protected fields before they reach Mongoose.
export function validateDocumentUpdate(req, res, next) {
    const body = req.body;
    const allowed = ["title", "content"];
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        !Object.keys(body).length ||
        Object.keys(body).some(key => !allowed.includes(key)) ||
        Object.values(body).some(value => typeof value !== "string")) {
        return res.status(400).json({ message: "Provide only title and/or content as strings" });
    }
    req.documentUpdate = { ...body, lastEditedBy: req.user.id };
    return next();
}

export const verifyViewUser = requireDocumentPermission("view");
export const verifyEditUser = requireDocumentPermission("edit");
export const verifyOwnerUser = requireDocumentPermission("owner");
