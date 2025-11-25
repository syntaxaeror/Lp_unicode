import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { Server } from "socket.io";
import { createServer } from "http";
import registerPresenceSocket from "./utils/socket.js";
import morgan from "morgan";
import pino from "pino";
import router from "./routes/userRoute.js";
import Drouter from "./routes/docRoute.js";
dotenv.config();

await connectDB();


let port = 8080;
const app = express();


const server = createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

await registerPresenceSocket(io)

const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
    }
});

logger.info("server online");


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('tiny'))
app.use("/", router)
app.use("/", Drouter);

server.listen(port, () => {
    console.log(`the server is listenning on port ${port}`);
});