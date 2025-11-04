import mongoose from "mongoose";

const DocHistorySchema = new mongoose.Schema({
    docId: { type: mongoose.Schema.Types.ObjectId, ref: "Userdocument", required: true },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", required: true
    },
    access: {
        view: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        edit: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
    },
    requests: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        type: { type: String, enum: ["view", "edit"], required: true },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
    }],
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    version: { type: Number, required: true }
},
);

const DocVersion = mongoose.model("DocVersion", DocHistorySchema);

export default DocVersion;
