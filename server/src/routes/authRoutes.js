import express from "express";
import { login, logout, signup } from "../controllers/authController.js";
import protect from "../middlewares/authMid.js";
import { loginValidator, signUpValidator } from "../validators/authVal.js";
import validate from "../validators/validate.js";

const router = express.Router();

router.post("/signup", signUpValidator, validate, signup);
router.post("/login", loginValidator, validate, login);
router.post("/logout", protect, logout);

export default router;
