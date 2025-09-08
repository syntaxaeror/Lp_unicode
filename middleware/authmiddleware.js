import jwt from "jsonwebtoken";

async function authorizationfn(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_ACESS_SECRET_KEY);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.log(error);
        res.status(401).json({ message: "token provided is not valid" });
    }
}

export {authorizationfn};