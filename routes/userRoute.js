import express from "express";
import { authorizationfn } from "../middleware/authmiddleware.js";
const app = express()
const router = express.Router()
import { AR } from "../controllers/authController.js";
import { R } from "../controllers/siteController.js";
import { createDoc, getDoc, updateDoc, deleteDOC, requestAccess, approveRequest, addUserAccess, getAllDoc } from "../controllers/docController.js";
import upload from "../middleware/multermiddleware.js";
import { uplaodProfileIcon } from "../controllers/ProfileIconController.js";
import { verifyOwnerUser, verifyEditUser } from "../middleware/verifymiddleware.js";

router.get("/user/get", authorizationfn, R.getUser);
router.get("/user/Allget", authorizationfn, R.getAllUser);
router.post("/user/create", R.createUser);
router.post("/user/register", AR.register);
router.post("/user/upload/profilepic/:id", authorizationfn, upload.single('file'), uplaodProfileIcon);
router.post("/user/refresh", AR.refresh);
router.post("/user/login", AR.login);
router.delete("/user/delete/:id", R.deleteUser);
router.get("/user/get/documents", authorizationfn, getDoc);
router.get("/user/get/Alldocuments", authorizationfn, getAllDoc);
router.post("/user/create/document", authorizationfn, createDoc);
router.put("/user/update/document/:doc_id", authorizationfn, verifyEditUser, updateDoc);
router.delete("/user/delete/document/:doc_id", authorizationfn, verifyOwnerUser, deleteDOC);
router.patch("/user/document/requestAccess", authorizationfn, requestAccess);
router.patch("/user/document/approveRequest/:doc_id", authorizationfn, verifyOwnerUser, approveRequest);
router.patch("/user/document/addUserAccess/:doc_id", authorizationfn, verifyOwnerUser, addUserAccess);

export default router;

