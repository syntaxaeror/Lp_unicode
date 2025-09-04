import express from "express";
const app = express()
const router = express.Router()
import { updateUser,getUser,createUser,deleteUser } from "../controllers/siteController.js";

router.get("/user/get",getUser);
router.post("/user/create",createUser);
router.put("/user/update/:id",updateUser);
router.delete("/user/delete/:id",deleteUser);

export default router;

