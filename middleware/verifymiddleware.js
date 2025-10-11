import Userdocument from "../models/document.js";

async function verifyEditUser(req, res, next) {
    const user_id = req.params.user_id;
    const doc_id = req.params.doc_id;
    try {
        let data = await Userdocument.findById({ _id: doc_id })
        if (!data) {
            res.status(400).json({ message: "No data found" })
        }
        if (data.createdBy == user_id || data.access.edit.includes(user_id)) {
            next()
        }
        else {
            res.status(400).json({ message: "User not authenticated" })
        }

    } catch (error) {

    }
}

async function verifyOwnerUser(req, res, next) {
    const user_id = req.params.user_id;
    const doc_id = req.params.doc_id;
    try {
        let data = await Userdocument.findById({ _id: doc_id })
        if (!data) {
            res.status(400).json({ message: "No data found" })
        }
        if (data.createdBy == user_id) {
            next()
        }
        else {
            res.status(400).json({ message: "User not authenticated" })
        }

    } catch (error) {

    }
}

export { verifyOwnerUser, verifyEditUser };