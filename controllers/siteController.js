import userDetails from "../models/user.js";
import pino from "pino";
const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
}});

async function getUser(req, res) {
    try {
        let data = await userDetails.find();
        logger.info(`user data displayed : ${data.length}`)
        res.send(data);
    }
    catch (error) {
        next(error);
    }
}

async function createUser(req, res) {
    try {
        let newu = req.body;
        let data = await userDetails.insertOne(newu);
        logger.info(`user data added successfully ${data._id}`)
        res.send("SUCCESSFULLY ADDED NEW USER");
    }
    catch (error) {
        next(error);
    }
}

async function updateUser(req, res,next) {
    try {
        let id = req.params.id;
        let updatedData = await req.body;
        let data = await userDetails.findByIdAndUpdate({ _id: id }, updatedData, { new: true, runValidators: true });
        if (!data) {
            logger.warn(`User id ${id} not found!`)
            return res.status(404).json({ message: "User not updated" });
        }
        else {
            logger.info(`User updated: ${data._id}`)
            return res.status(200).json(data);
        }
    }
    catch (error) {
        next(error);
    }
}

async function deleteUser(req, res) {
    try {
        let id = req.params.id;
        let data = await userDetails.findByIdAndDelete({ _id: id });
        logger.info(`user data deleted successfully ${data._id}`)
        if (!data) {
            logger.warn(`User id ${id} not found!`)
            return res.status(404).json({ message: "User not deleted!" });
        }
        else {
            logger.info(`User deleted" ${id}`);
            return res.status(200).json({ message: "User successfully deleted" });
        }
    }
    catch (error) {
        next(error);
    }
}

export {
    createUser,
    getUser,
    updateUser,
    deleteUser
};