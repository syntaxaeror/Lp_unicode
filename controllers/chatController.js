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


// async function run(content) {
//     const response = await ai.models.generateContent({
//         model: "gemini-2.5-flash",
//         contents: content,
//     });

//     console.log(response.text);
// }

// run("i am making an app that works like github");

async function chatbot() {
    const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        history: [],
        generationConfig: {
            maxOutputTokens: 500,
        },
    });

    async function askAndRespond() {
        rl.question("You: ", async (question) => {
            if (question.toLowerCase() === "exit") {
                rl.close();
                return;
            }
            const result = await chat.sendMessage({ message: question })
            const text = result.text;
            console.log("AI: ", text);
            askAndRespond();
        });
    }

    askAndRespond();
}

export default chatbot;