import jwt from "jsonwebtoken";

const accessToken = (payload) => {
    return jwt.sign(
        { id: payload.id, email: payload.email },
        process.env.JWT_ACESS_SECRET_KEY,
        { expiresIn: "15m" });
}

const refreshToken = (payload) => {
    return jwt.sign(
        { id: payload.id, email: payload.email },
        process.env.JWT_REFRESH_SECRET_KEY,
        { expiresIn: "7d" });
}

export const T = {
    accessToken,
    refreshToken
}