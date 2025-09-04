import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    "name": String,
    "email": String,
    "dob": Date,
    "credit_scores": Number,
},
    {
        timestamps: true, 
    }
);
const userDetails = mongoose.model("userDetails", userSchema);

export default userDetails;