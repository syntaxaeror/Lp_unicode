import Userdocument from "../models/document.js";
import pino from "pino";
import { sendMail } from "../utils/mailer.js";
import userDetails from "../models/user.js";
import PDFBuild from "../utils/pdf-service.js";
import client from "../config/elasticsearch.js";
import mongoose from "mongoose";
import { documentAccess } from "../services/document-access.js";
import { evictUserFromDocument, removeClientFromDoc } from "./socketHandler.js";

const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
    }
});

async function createDoc(req, res) {
    try {
        let id = req.user.id;
        let { title, content, tags } = req.body;
        let data = await Userdocument.create({
            title,
            content,
            createdBy: id
        });
        logger.info(`Document created with ID: ${data._id}`);
        await client.index({
            index: "documents",
            id: data._id.toString(),
            document: {
                title: data.title,
                content: data.content,
                tags: tags || [],
                authorId: id,
                createdAt: data.createdAt
            }
        });
        logger.info(`index created of ${data._id}`);
        res.status(201).json({ message: "Document created", document: data });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function getDoc(req, res) {
    try {
        const user_id = req.user.id;
        const data = await documentAccess.list(user_id);
        if (!data) {
            res.status(400).json({ message: "No data found" })
        }
        logger.info(`user DOC displayed : ${data.length}`)
        res.status(200).json({ data })
    } catch (error) {
        res.status(401).json({ message: "error", error });
    }
}

async function updateDoc(req, res) {
    try {
        const doc_id = req.params.doc_id;
        const updatedContent = req.documentUpdate;
        let data = await Userdocument.findByIdAndUpdate({ _id: doc_id }, updatedContent, { new: true, runValidators: true });
        if (!data) {
            logger.warn(`User DOC id : ${doc_id} not found!`)
            return res.status(404).json({ message: "User not updated" });
        }
        else {
            logger.info(`User DOC updated: ${data._id}`)
            await client.update({
                index: "documents",
                id: data._id.toString(),
                document: {
                    title: data.title,
                    content: data.content,
                    tags: data.tags || [],
                    lastEditedBy: data.lastEditedBy,
                    updatedAt: data.updatedAt
                }
            });
            logger.info(`index DOC updated: ${doc_id}`);
            return res.status(200).json(data);
        }
    } catch (error) {
        console.log(error);
        res.status(401).json({ message: "error", error: error.message });
    }
}

async function deleteDOC(req, res) {
    try {
        const doc_id = req.params.doc_id;
        let data = await Userdocument.findByIdAndDelete({ _id: doc_id });
        if (!data) {
            logger.warn(`User DOC ${doc_id} not found!`)
            return res.status(404).json({ message: "User DOC not deleted!" });
        }
        else {
            logger.info(`user DOC deleted successfully ${data._id}`);
            const io = req.app.get("io");
            if (io) {
                const roomId = String(data._id);
                const sockets = await io.in(roomId).fetchSockets();
                for (const socket of sockets) {
                    await socket.leave(roomId);
                    removeClientFromDoc(roomId, socket.id, io);
                }
            }
            await client.delete({
                index: "documents",
                id: data._id.toString()
            });
            logger.info(`index DOC deleted" ${doc_id}`);
            return res.status(200).json({ message: "User DOC successfully deleted" });
        }
    } catch (error) {
        console.log(error);
        res.status(401).json({ message: "error", error: error.message });
    }
}

async function requestAccess(req, res) {
    try {
        const id = req.user.id;
        const { doc_id, requests } = req.body ?? {};
        if (!mongoose.isObjectIdOrHexString(doc_id) || !["view", "edit"].includes(requests?.type)) {
            return res.status(400).json({ message: "Valid doc_id and requests.type required" });
        }
        const request = { user: id, type: requests.type, status: "pending" };
        let data = await Userdocument.findByIdAndUpdate(doc_id,
            { $addToSet: { requests: request } }, { new: true, runValidators: true });
        if (!data) {
            logger.warn(`User DOC id : ${id} not found!`)
            return res.status(404).json({ message: "Request not Sent" });
        }
        else {
            let owner = await userDetails.findOne({ _id: data.createdBy });
            const info = await sendMail(owner.email, "Requesting access", `User ${id} is requesting ${request.type} access For document ${doc_id}`);
            logger.info(`Request of User ${id} sent to: ${data.createdBy._id}`)
            return res.status(200).json({ message: "Access request sent" });
        }
    } catch (error) {
        console.log(error);
        res.status(401).json({ message: "error", error: error.message });
    }
}

async function approveRequest(req, res) {
    const user_id = req.user.id;
    const doc_id = req.params.doc_id;
    const body = req.body;
    try {
        let data = req.document;
        if (!data) {
            logger.warn(`User DOC ${user_id} not found!`)
            return res.status(404).json({ message: "User DOC not found" });
        }

        const data2 = data.requests.id(body.requests_id);
        if (!data2) {
            logger.warn(`request of ${user_id} not found!`)
            return res.status(404).json({ message: "User request not found" });
        }

        data2.status = body.status;

        if (body.status == "approved") {
            if (data2.type === "view") {
                if (!data.access.view.includes(data2.user)) {
                    data.access.view.push(data2.user);
                }
            } else if (data2.type === "edit") {
                if (!data.access.edit.includes(data2.user)) {
                    data.access.edit.push(data2.user);
                }
            }
        }

        await data.save();
        logger.info(`Request of User ${data2.user} approved`)
        res.json({ message: "Request approved", document: data });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
}

async function addUserAccess(req, res) {
    const doc_id = req.params.doc_id;
    const request = req.body;
    try {
        let data = req.document;
        if (!data) {
            logger.warn(`document ${user_id} not found!`)
            return res.status(404).json({ message: "User request not found" });
        }
        if (request.type === "view") {
            if (!data.access.view.includes(request.user_id)) {
                data.access.view.push(request.user_id);
            }
        } else if (request.type === "edit") {
            if (!data.access.edit.includes(request.user_id)) {
                data.access.edit.push(request.user_id);
            }
        }
        await data.save();
        logger.info(`${request.type} access granted to ${request.user_id} `)
        res.json({ message: "user added to access list ", document: data });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
}

async function revokeUserAccess(req, res, next) {
    const { user_id } = req.body ?? {};
    if (!mongoose.isObjectIdOrHexString(user_id)) {
        return res.status(400).json({ message: "Valid user_id required" });
    }
    if (String(req.document.createdBy) === user_id) {
        return res.status(400).json({ message: "Owner access cannot be revoked" });
    }
    try {
        const doc_id = req.params.doc_id;
        await Userdocument.updateOne({ _id: doc_id, createdBy: req.user.id }, {
            $pull: { "access.view": user_id, "access.edit": user_id }
        });
        await evictUserFromDocument(req.app.get("io"), String(req.document._id), user_id.toLowerCase());
        return res.json({ message: "Access revoked" });
    } catch (error) {
        return next(error);
    }
}

async function getPDF(req, res) {
    const stream = res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment;  filename = schema'
    });

    PDFBuild(
        (chunk) => stream.write(chunk),
        () => stream.end()
    );

    logger.info(`pdf made successfully`)
}

export { createDoc, getDoc, updateDoc, deleteDOC, requestAccess, approveRequest, addUserAccess, revokeUserAccess, getPDF };
