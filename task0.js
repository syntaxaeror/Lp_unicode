const express = require("express");
const axios = require("axios");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const userDetails = require("./models/user");
let port = 8080;
const morgan = require("morgan");
const pino = require("pino");
const pretty = require("pino-pretty");
const logger = pino(stream = pretty({
    colorize:true
}))

logger.info("hi");

main().then(()=>{
    console.log("connection was successful");
}).catch((err)=>{
    console.log(err);
});

async function main(){
    await mongoose.connect("mongodb://127.0.0.1:27017/user");
}

app.use(express.urlencoded({ extended : true}));
app.use(express.json()); 
app.use(morgan('tiny'))

app.listen(port,() => {
    console.log(`the server is listenning on port ${port}`);
});

app.get("/user/get",async (req,res)=>{
    let data = await userDetails.find();
    console.log(data);
    res.send(data);
})

app.post("/user/create",async (req,res)=>{
    let newu = req.body;
    let data = await userDetails.insertOne(newu);
    console.log(data);
    res.send("SUCCESSFULLY ADDED NEW USER");
})

app.put("/user/update/:id",async (req,res)=>{
    let id = req.params.id;
    let updatedData = await req.body;
    let data = await userDetails.findByIdAndUpdate({_id:id}, updatedData, { new: true, runValidators: true });
    console.log(data);
    res.send("SUCCESSFULLY UPDATED THE INFORMATION");
})

app.delete("/user/delete/:id",async (req,res)=>{
    let id = req.params.id;
    let data = await userDetails.findByIdAndDelete({_id:id});
    console.log(data);
    res.send("SUCCESSFULLY DELETED THE USER");
})







