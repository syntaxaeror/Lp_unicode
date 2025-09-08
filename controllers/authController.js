import userDetails from "../models/user.js";
import pino from "pino";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { T } from "../utils/token.js";
import { sendMail } from "../utils/mailer.js";
const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
    }
});

async function register(req, res) {
    try {
        let data = await req.body;
        data.password = await bcrypt.hash(data.password, 10);
        let response = await userDetails.insertOne(data);
        const info = await sendMail(data.email, "Welcome!", "Thanks for registering Welcome to Unicode");
        logger.info(`user register successfully`);
        res.send("user register successfully");
    }
    catch (error) {
        console.log(error);
        res.send("error");
    }
}

async function login(req, res) {
    try {
        let data = req.body;
        let response = await userDetails.find({ email: data.email });
        if (!response) {
            logger.warn(`User email ${data.email} not found!`);
            return res.status(404).json({ message: "User not found" });
        }
        else {
            const check = await bcrypt.compare(data.password, response[0].password);
            if (check) {
                const accessToken = T.accessToken(response);
                const refreshToken = T.refreshToken(response);
                const info = await sendMail(data.email, "Welcome!", "YOU HAVE SUCESSFULLY LOGGED IN");
                logger.info(`User logged in with: ${data.email}`);
                return res.status(200).json({ "data": data, "AccessTOKEN": accessToken, "refreshToken": refreshToken });
            }
            else {
                return res.status(401).send("WRONG PASSWORD");
            }
        }
    }
    catch (error) {
        logger.error(`Login error: ${error.message}`);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function refresh(req, res) {
    const refreshToken = req.headers.authorization?.split(" ")[1];
    if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" });
    }
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);
        const resp = [{
            id : decoded.id,
            email : decoded.email
        }]
        const newAccessToken = T.accessToken(resp);
        return res.json({ "accessToken": newAccessToken });
    }
    catch (error) {
        return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

}

export const AR = {
    register,
    login,
    refresh
} 