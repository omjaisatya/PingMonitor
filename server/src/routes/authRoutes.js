import express from "express";
import {
  changePassword,
  login,
  logout,
  refreshTokenEP,
  signup,
  user,
} from "../controllers/authController.js";
import protect from "../middlewares/authMid.js";
import { loginValidator, signUpValidator } from "../validators/authVal.js";
import validate from "../validators/validate.js";
import { csrfProtect } from "../middlewares/csrfMid.js";
import { loginRateLimiter } from "../middlewares/loginRateLimiter.js";

const router = express.Router();

// public
router.post("/signup", signUpValidator, validate, signup);
router.post("/login", loginRateLimiter, loginValidator, validate, login);
router.post("/refresh", csrfProtect, refreshTokenEP);
// protected
router.post("/logout", protect, csrfProtect, logout);
router.get("/me", protect, user);
router.post("/change-password", protect, csrfProtect, changePassword);

export default router;
