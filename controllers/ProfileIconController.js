import userDetails from "../models/user.js";
import pino from "pino";
import cloudinary from "../config/cloudinary.js";

const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
    }
});

async function uplaodProfileIcon(req, res) {
    try {
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "profile_icons"
        })
        console.log(result);

        // update user
        const user = await userDetails.findByIdAndUpdate(
            { _id: req.params.id },
            { profile_picture: result.secure_url },
            { new: true }
        );
        return res.json({ message: "Profile picture updated!", user });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

export { uplaodProfileIcon }