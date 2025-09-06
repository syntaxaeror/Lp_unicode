import userDetails from "../models/user.js";
import pino from "pino";
import bcrypt from "bcryptjs";

const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
}});

async function register(req ,res){
    try {
        let data = await req.body;
        data.password = await bcrypt.hash(data.password,10);
        let response = await userDetails.insertOne(data);
        logger.info(`user register successfully`);
        res.send("user register successfully");
    }
    catch(error){
        res.send("error");
    }
}

async function login(req ,res){
    try {
        let data = req.body;
        let response = await userDetails.find({email: data.email});
        if (!response) {
            logger.warn(`User email ${data.email} not found!`);
            return res.status(404).json({ message: "User not found" });
        }
        else {
            const check = await bcrypt.compare(data.password, response[0].password);
            if(check){
                logger.info(`User logged in: ${data.email}`);
                return res.status(200).json(data);
            }
            else{
                return res.status(401).send("WRONG PASSWORD");
            }
        }
    }
    catch(error){
        logger.error(`Login error: ${error.message}`);
        return res.status(500).json({ message: "Internal server error" });
    }
}

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

export const R = {
    createUser,
    getUser,
    updateUser,
    deleteUser,
    register,
    login
};