import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export function verifyAccessToken(token) {
    const decoded = jwt.verify(token, process.env.JWT_ACESS_SECRET_KEY, { algorithms: ["HS256"] });
    if (!decoded || typeof decoded !== "object" || !mongoose.isObjectIdOrHexString(decoded.id) ||
        !Number.isFinite(decoded.exp)) throw new Error("Invalid access token identity");
    return { id: decoded.id, email: decoded.email, exp: decoded.exp };
}

export function authorizationfn(req, res, next) {
    const token = req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return res.status(401).json({ message: "Bearer access token required" });
    try {
        req.user = verifyAccessToken(token);
    } catch {
        return res.status(401).json({ message: "Invalid or expired access token" });
    }
    return next();
}

export function adminAuthorizationfn(req, res, next) {
    return authorizationfn(req, res, () => {
        if (!process.env.ADMIN_EMAIL || req.user.email !== process.env.ADMIN_EMAIL) {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }
        return next();
    });
}

export function verifySelfUser(req, res, next) {
    if (req.params.id !== req.user.id) return res.status(403).json({ message: "Cannot modify another account" });
    return next();
}

export function authenticateSocket(socket, next) {
    try {
        const token = socket.handshake.auth?.token ??
            socket.handshake.headers?.authorization?.match(/^Bearer (\S+)$/i)?.[1];
        socket.data.user = verifyAccessToken(token);
        return next();
    } catch {
        return next(new Error("Invalid or expired access token"));
    }
}
