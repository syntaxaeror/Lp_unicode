import express from "express";
const app = express()
const router = express.Router()
import {AR} from "../controllers/authController.js";
import {R} from "../controllers/siteController.js";

router.get("/user/get",R.getUser);
router.post("/user/create",R.createUser);
router.post("/user/register",AR.register);
router.post("/user/refresh",AR.refresh);
router.post("/user/login",AR.login);
router.put("/user/update/:id",R.updateUser);
router.delete("/user/delete/:id",R.deleteUser);

export default router;

