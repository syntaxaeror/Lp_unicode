import express from "express";
import { authorizationfn } from "../middleware/authmiddleware.js";
const app = express()
const router = express.Router()
import { AR } from "../controllers/authController.js";
import { R } from "../controllers/siteController.js";
import { createDoc, getDoc, updateDoc, deleteDOC, requestAccess, approveRequest, addUserAccess } from "../controllers/docController.js";
import upload from "../middleware/multermiddleware.js";
import { uplaodProfileIcon } from "../controllers/ProfileIconController.js";

router.get("/user/get", authorizationfn, R.getUser);
router.post("/user/create", R.createUser);
router.post("/user/register", AR.register);
router.post("/user/upload/profilepic/:id", authorizationfn, upload.single('file'), uplaodProfileIcon);
router.post("/user/refresh", AR.refresh);
router.post("/user/login", AR.login);
router.delete("/user/delete/:id", R.deleteUser);
router.get("/user/get/documents/:id", authorizationfn, getDoc);
router.post("/user/create/document/:id", authorizationfn, createDoc);
router.put("/user/update/document/:id", authorizationfn, updateDoc);
router.delete("/user/delete/document/:id", authorizationfn, deleteDOC);
router.patch("/user/doc/requestAccess/:id", requestAccess);
router.patch("/user/doc/approveRequest/:id", approveRequest);
router.patch("/user/doc/addUserAccess/:id", addUserAccess);

export default router;

