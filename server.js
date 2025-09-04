import express from "express";
const app = express();
import mongoose from "mongoose";
let port = 8080;
import morgan from "morgan";
import pino from "pino";
const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
}});
import router from "./routes/userRoute.js";

logger.info("server online");

async function main(){
    await mongoose.connect("mongodb://127.0.0.1:27017/user");
}

main().then(()=>{
    console.log("database connection was successful");
}).catch((err)=>{
    console.log(err);
});

app.use(express.urlencoded({ extended : true}));
app.use(express.json()); 
app.use(morgan('tiny'))

app.listen(port,() => {
    console.log(`the server is listenning on port ${port}`);
});

app.use("/",router);