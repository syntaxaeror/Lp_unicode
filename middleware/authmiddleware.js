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

async function adminAuthorizationfn(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_ACESS_SECRET_KEY);
        req.user = decoded;
        if (req.user.email !== process.env.ADMIN_EMAIL) {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }
        next();
    }
    catch (error) {
        console.log(error);
        res.status(401).json({ message: "token provided is not valid" });
    }
}

export { authorizationfn, adminAuthorizationfn };