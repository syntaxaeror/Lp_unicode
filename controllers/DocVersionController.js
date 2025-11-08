import DocVersion from "../models/doc_version.js";
import pino from "pino";
import { diffLines } from "diff";
import Userdocument from "../models/document.js";

const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
    }
});


function getDocDiff(oldVersion, newVersion) {
    const diff = diffLines(oldVersion.content, newVersion.content);
    return diff.map(part => ({
        text: part.value,
        type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged'
    }));
}


async function getDocHistory(req, res) {
    try {
        let doc_id = req.params.doc_id;
        let user_id = req.user.id;
        let data = await DocVersion.find({ docId: doc_id, createdBy: user_id })
        if (!data) {
            return res.status(400).json({ message: "No data found" })
        }
        logger.info(`user DOC History displayed : ${data.length}`)
        res.status(200).json({ data })
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function docDiffVeiwer(req, res) {
    try {
        let docId = req.params.doc_id;
        let user_id = req.user.id;
        const body = req.body;
        let version1 = await DocVersion.findOne({ docId, version: body.version1 })
        let version2 = await DocVersion.findOne({ docId, version: body.version2 })
        const result = getDocDiff(version1, version2);
        logger.info(`displayed version diff of version : ${body.version1} and version : ${body.version2}`)
        return res.status(200).json({ result })

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function docRestore(req, res) {
    try {
        let doc_id = req.params.doc_id;
        let version = req.body.version;
        let oldVersion = await DocVersion.findOne({ docId: doc_id, version })
        if (!oldVersion) {
            return res.status(400).json({ message: "No data found" })
        }
        let newVersion = await Userdocument.findOne({ _id: doc_id })
        newVersion.title = oldVersion.title;
        newVersion.content = oldVersion.content;
        newVersion.version = oldVersion.version;
        newVersion.save();
        return res.status(200).json({ restored_DOC: newVersion })
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export { getDocHistory, docDiffVeiwer, docRestore }