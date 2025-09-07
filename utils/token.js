import jwt from "jsonwebtoken";

const accessToken = (payload) => {
    return jwt.sign(
        { id: payload[0].id, email: payload[0].email },
        process.env.JWT_ACESS_SECRET_KEY,
        { expiresIn: "1m" });
}

const refreshToken = (payload) => {
    return jwt.sign(
        { id: payload[0].id, email: payload[0].email },
        process.env.JWT_REFRESH_SECRET_KEY,
        { expiresIn: "7d" });
}

export const T = {
    accessToken,
    refreshToken
}