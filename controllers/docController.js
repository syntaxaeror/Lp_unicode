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


export { createDoc, getDoc, updateDoc, deleteDOC };
