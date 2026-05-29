import express from "express";
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  refreshTokenEP,
  resendVerification,
  resetPassword,
  signup,
  user,
  verifyEmail,
} from "../controllers/authController.js";
import protect from "../middlewares/authMid.js";
import {
  forgotPasswordValidator,
  loginValidator,
  resetPasswordValidator,
  signUpValidator,
} from "../validators/authVal.js";
import validate from "../validators/validate.js";
import { csrfProtect } from "../middlewares/csrfMid.js";
import { loginRateLimiter } from "../middlewares/loginRateLimiter.js";

const router = express.Router();

// public
router.post("/signup", signUpValidator, validate, signup);
router.post("/login", loginRateLimiter, loginValidator, validate, login);
router.post("/forgot-password", forgotPasswordValidator, validate, forgotPassword);
router.post("/reset-password", resetPasswordValidator, validate, resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/refresh", csrfProtect, refreshTokenEP);
// protected
router.post("/logout", protect, csrfProtect, logout);
router.get("/me", protect, user);
router.post("/resend-verification", protect, csrfProtect, resendVerification);
router.post("/change-password", protect, csrfProtect, changePassword);

export default router;
