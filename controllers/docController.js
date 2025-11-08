import Userdocument from "../models/document.js";
import pino from "pino";


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
        let { title, content } = req.body;
        let data = await Userdocument.create({
            title,
            content,
            createdBy: id
        });
        res.status(201).json({ message: "Document created", document: data });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function getDoc(req, res) {
    try {
        const user_id = req.user.id;
        const data = await Userdocument.find({ $or: [{ createdBy: user_id }, { "access.view": user_id }] });
        if (!data) {
            res.status(400).json({ message: "No data found" })
        }
        logger.info(`user DOC displayed : ${data.length}`)
        res.status(200).json({ data })
    } catch (error) {
        res.status(401).json({ message: "error", error });
    }
}

async function getAllDoc(req, res) {
    try {
        const data = await Userdocument.find();
        if (!data) {
            res.status(400).json({ message: "No data found" })
        }
        logger.info(`user DOC displayed : ${data.length}`)
        res.status(200).json({ data })
    } catch (error) {
        console.log(error);
        res.status(401).json({ message: "error", error });
    }
}


async function updateDoc(req, res) {
    try {
        const doc_id = req.params.doc_id;
        const updatedContent = req.body;
        updatedContent.lastEditedBy = req.user.id;
        let data = await Userdocument.findByIdAndUpdate({ _id: doc_id }, updatedContent, { new: true, runValidators: true });
        if (!data) {
            logger.warn(`User DOC id : ${doc_id} not found!`)
            return res.status(404).json({ message: "User not updated" });
        }
        else {
            logger.info(`User DOC updated: ${data._id}`)
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
        logger.info(`user DOC deleted successfully ${data._id}`)
        if (!data) {
            logger.warn(`User DOC ${doc_id} not found!`)
            return res.status(404).json({ message: "User DOC not deleted!" });
        }
        else {
            logger.info(`User DOC deleted" ${doc_id}`);
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
        const updates = req.body;
        updates.requests.user = id;
        let data = await Userdocument.findByIdAndUpdate({ _id: updates.doc_id }, { $addToSet: updates }, { new: true, runValidators: true });
        if (!data) {
            logger.warn(`User DOC id : ${id} not found!`)
            return res.status(404).json({ message: "Request not Sent" });
        }
        else {
            logger.info(`Request of User ${id} sent to: ${data.createdBy._id}`)
            return res.status(200).json(data);
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
        let data = await Userdocument.findOne({ _id: doc_id, "requests._id": body.requests_id });
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
        let data = await Userdocument.findOne({ _id: doc_id });
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

export { createDoc, getDoc, updateDoc, deleteDOC, requestAccess, approveRequest, addUserAccess, getAllDoc };
