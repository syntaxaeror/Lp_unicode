import express from "express";
const app = express()
const router = express.Router()
import {R} from "../controllers/siteController.js";

router.get("/user/get",R.getUser);
router.post("/user/create",R.createUser);
router.post("/user/register",R.register);
router.post("/user/login",R.login);
router.put("/user/update/:id",R.updateUser);
router.delete("/user/delete/:id",R.deleteUser);

export default router;

