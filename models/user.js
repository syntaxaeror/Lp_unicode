import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  "name": String,
  "email": {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      "Please enter a valid email address",
    ],
  },
  "dob": Date,
  "credit_scores": Number,
  "password": {
    type: String,
    required: true,
    minlength: 8,
  },
  profile_picture: {
    type: String,
    default: ""
  }
},
  {
    timestamps: true,
  }
);
const userDetails = mongoose.model("userDetails", userSchema);

export default userDetails;