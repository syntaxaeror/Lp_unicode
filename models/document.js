import mongoose from "mongoose";
import DocVersion from "./doc_version.js";

const DocumentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
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
    version: { type: Number, required: true, default: 1 }
}, { timestamps: true });

DocumentSchema.pre("findOneAndUpdate", async function (next) {
    try {
        const docId = this.getQuery()._id;
        const update = this.getUpdate();
        if (!docId) return next();

        const existingDoc = await mongoose.model("Userdocument").findById(docId);
        if (!existingDoc) return next();

        if (update.hasOwnProperty('content')) {
            const count = await DocVersion.countDocuments({ docId });

            await DocVersion.create({
                docId,
                title: existingDoc.title,
                content: existingDoc.content,
                createdBy: existingDoc.createdBy,
                access: existingDoc.access,
                requests: existingDoc.requests,
                lastEditedBy: update.lastEditedBy,
                version: count + 1
            });

            existingDoc.version = count + 2;
            if (!update.$set) update.$set = {};
            update.$set.updatedAt = new Date();

            console.log("✅ Snapshot saved: Version", count + 1);
            existingDoc.save();
        }
        next();
    } catch (err) {
        console.error("❌ Error in versioning hook:", err);
        next(err);
    }
});

const Userdocument = mongoose.model("Userdocument", DocumentSchema);
export default Userdocument;