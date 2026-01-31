import { GoogleGenAI } from "@google/genai";
import readline from "readline";
import dotenv from "dotenv";
import Userdocument from "../models/document.js";
dotenv.config();

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});



async function chatbot(req, res) {
    const user_id = req.user.id;
    const data = await Userdocument.find({ $or: [{ createdBy: user_id }, { "access.view": user_id }] });
    const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        history: [{
            role: "user",
            parts: [
                { text: "You are a helpful assistant. help the user and use the below documents data if needed: " },
                { text: JSON.stringify(data, null, 2) },
            ]
        }],
        Config: {
            maxOutputTokens: 500,
        },
    });

    async function askAndRespond() {
        rl.question("You: ", async (question) => {
            if (question.toLowerCase() === "exit") {
                rl.close();
                return res.status(200).json({ message: "Chatbot session ended." });
            }

            const result = await chat.sendMessage({
                message: question,
            });
            const text = result.text;
            console.log("AI: ", text);
            askAndRespond();
        });
    }
    await askAndRespond();
}

export default chatbot;