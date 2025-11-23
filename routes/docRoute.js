import express from "express";
import { authorizationfn } from "../middleware/authmiddleware.js";
const app = express()
const Drouter = express.Router()
import { getDocHistory, docDiffVeiwer, docRestore } from "../controllers/DocVersionController.js"
import { createDoc, getDoc, updateDoc, deleteDOC, requestAccess, approveRequest, addUserAccess, getAllDoc, getPDF } from "../controllers/docController.js";
import { verifyOwnerUser, verifyEditUser } from "../middleware/verifymiddleware.js";

Drouter.get("/user/get/documents", authorizationfn, getDoc);
Drouter.get("/user/get/Alldocuments", authorizationfn, getAllDoc);
Drouter.post("/user/create/document", authorizationfn, createDoc);
Drouter.put("/user/update/document/:doc_id", authorizationfn, verifyEditUser, updateDoc);
Drouter.delete("/user/delete/document/:doc_id", authorizationfn, verifyOwnerUser, deleteDOC);
Drouter.patch("/user/document/requestAccess", authorizationfn, requestAccess);
Drouter.patch("/user/document/approveRequest/:doc_id", authorizationfn, verifyOwnerUser, approveRequest);
Drouter.patch("/user/document/addUserAccess/:doc_id", authorizationfn, verifyOwnerUser, addUserAccess);
Drouter.get("/user/document/history/:doc_id", authorizationfn, getDocHistory)
Drouter.get("/user/document/PDF", authorizationfn, getPDF)
Drouter.post("/user/document/versionDiff/:doc_id", authorizationfn, docDiffVeiwer)
Drouter.put("/user/document/restore/:doc_id", authorizationfn, docRestore)

export default Drouter