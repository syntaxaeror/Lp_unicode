import mongoose from "mongoose";

async function connectDB() {
    try {
        await mongoose.connect(process.env.atlas_URI)
        console.log(`Mongo DB connected!`);
    } catch (error) {
        console.log("Mongo DB connection error: ", error);
        process.exit(1);
    }
}

export default connectDB;