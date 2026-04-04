import express from "express";
import { login, logout, signup } from "../controllers/authController.js";
import protect from "../middlewares/authMid.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", protect, logout);

export default router;
