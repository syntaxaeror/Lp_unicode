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
        // create new doc for user with id
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
        const id = req.params.id;
        const data = await Userdocument.find({ createdBy: id });
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
        const id = req.params.id;
        const updatedContent = req.body;
        let data = await Userdocument.findByIdAndUpdate({ _id: id }, updatedContent, { new: true, runValidators: true });
        if (!data) {
            logger.warn(`User DOC id : ${id} not found!`)
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
        const id = req.params.id;
        let data = await Userdocument.findByIdAndDelete({ _id: id });
        logger.info(`user DOC deleted successfully ${data._id}`)
        if (!data) {
            logger.warn(`User DOC ${id} not found!`)
            return res.status(404).json({ message: "User DOC not deleted!" });
        }
        else {
            logger.info(`User DOC deleted" ${id}`);
            return res.status(200).json({ message: "User DOC successfully deleted" });
        }
    } catch (error) {
        console.log(error);
        res.status(401).json({ message: "error", error: error.message });
    }
}

async function requestAccess(req, res) {
    try {
        const id = req.params.id;
        const updates = req.body;
        updates.requests.user = id
        let data = await Userdocument.findByIdAndUpdate({ _id: updates.doc_id }, { $set: updates }, { new: true, runValidators: true });
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
    const user_id = req.params.id;
    console.log(user_id);
    const body = req.body;
    console.log(body);
    try {
        let data = await Userdocument.findOne({ _id: body.doc_id, "requests._id": body.requests_id });
        console.log(data);
        if (!data) {
            logger.warn(`User DOC ${user_id} not found!`)
            return res.status(404).json({ message: "User DOC not found" });
        }

        const data2 = data.requests.id(body.requests_id);
        console.log(data2);
        if (!data2) {
            logger.warn(`request of ${user_id} not found!`)
            return res.status(404).json({ message: "User request not found" });
        }

        data2.status = "approved";

        if (data2.type === "view") {
            if (!data.access.view.includes(user_id)) {
                data.access.view.push(user_id);
            }
        } else if (data2.type === "edit") {
            if (!data.access.edit.includes(user_id)) {
                data.access.edit.push(user_id);
            }
        }
        await data.save();
        logger.info(`Request of User ${user_id} approved`)
        res.json({ message: "Request approved", document: data });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
}

async function addUserAccess(req, res) {
    const doc_id = req.params.id;
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

export { createDoc, getDoc, updateDoc, deleteDOC, requestAccess, approveRequest, addUserAccess };
