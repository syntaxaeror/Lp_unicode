import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
const app = express();
let port = 8080;
import morgan from "morgan";
import pino from "pino";
const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
    }
});
dotenv.config();
import router from "./routes/userRoute.js";
import Drouter from "./routes/docRoute.js";

logger.info("server online");

async function connectdatabase() {
    await connectDB();
};

connectdatabase();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('tiny'))

app.listen(port, () => {
    console.log(`the server is listenning on port ${port}`);
});

app.use("/", router);
app.use("/", Drouter);