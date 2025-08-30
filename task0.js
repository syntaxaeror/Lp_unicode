const express = require("express");
const axios = require("axios");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const userDetails = require("./models/user");
let port = 8080;

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

app.listen(port,() => {
    console.log(`the server is listenning on port ${port}`);
});

app.get("/user/get",async (req,res)=>{
    let data = await userDetails.find();
    console.log(data);
    res.send(data);
})

