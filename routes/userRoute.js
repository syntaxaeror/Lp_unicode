import express from "express";
import { authorizationfn } from "../middleware/authmiddleware.js";
const app = express()
const router = express.Router()
import { AR } from "../controllers/authController.js";
import { R } from "../controllers/siteController.js";
import { createDoc, getDoc, updateDoc, deleteDOC, requestAccess, approveRequest, addUserAccess } from "../controllers/docController.js";
import upload from "../middleware/multermiddleware.js";
import { uplaodProfileIcon } from "../controllers/ProfileIconController.js";
import { verifyOwnerUser, verifyEditUser } from "../middleware/verifymiddleware.js";

router.get("/user/get", authorizationfn, R.getUser);
router.post("/user/create", R.createUser);
router.post("/user/register", AR.register);
router.post("/user/upload/profilepic/:id", authorizationfn, upload.single('file'), uplaodProfileIcon);
router.post("/user/refresh", AR.refresh);
router.post("/user/login", AR.login);
router.delete("/user/delete/:id", R.deleteUser);
router.get("/user/get/documents/:user_id", authorizationfn, getDoc);
router.post("/user/create/document/:id", authorizationfn, createDoc);
router.put("/user/update/:user_id/document/:doc_id", verifyEditUser, updateDoc);
router.delete("/user/delete/user_id/document/:doc_id", authorizationfn, verifyOwnerUser, deleteDOC);
router.patch("/user/document/requestAccess/:id", requestAccess);
router.patch("/user/:user_id/document/approveRequest/:doc_id", verifyOwnerUser, approveRequest);
router.patch("/user/:user_id/document/addUserAccess/:doc_id", verifyOwnerUser, addUserAccess);

export default router;

