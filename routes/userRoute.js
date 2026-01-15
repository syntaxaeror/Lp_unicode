import express from "express";
import { authorizationfn } from "../middleware/authmiddleware.js";
const app = express()
const router = express.Router()
import { AR } from "../controllers/authController.js";
import { R } from "../controllers/siteController.js";
import upload from "../middleware/multermiddleware.js";
import { uplaodProfileIcon } from "../controllers/ProfileIconController.js";

router.get("/user/get", authorizationfn, R.getUser);
router.get("/user/Allget", authorizationfn, R.getAllUser);
router.post("/user/create", R.createUser);
router.post("/user/register", AR.register);
router.post("/user/upload/profilepic/:id", authorizationfn, upload.single('file'), uplaodProfileIcon);
router.post("/user/refresh", AR.refresh);
router.post("/user/login", AR.login);
router.put("/user/update", authorizationfn, R.updateUser);
router.delete("/user/delete/:id", R.deleteUser);

export default router;

