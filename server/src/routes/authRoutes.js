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
/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     description: Create a new account with email, username, and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               username:
 *                 type: string
 *                 example: testuser
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongP@ss123
 *     responses:
 *       201:
 *         description: User successfully registered.
 *       400:
 *         description: Invalid input parameters.
 */
router.post("/signup", signUpValidator, validate, signup);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a user
 *     description: Login using email/username and password to obtain a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongP@ss123
 *     responses:
 *       200:
 *         description: Authentication successful.
 *       401:
 *         description: Invalid credentials.
 */
router.post("/login", loginRateLimiter, loginValidator, validate, login);

router.post("/forgot-password", forgotPasswordValidator, validate, forgotPassword);
router.post("/reset-password", resetPasswordValidator, validate, resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/refresh", csrfProtect, refreshTokenEP);

// protected
router.post("/logout", protect, csrfProtect, logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get currently authenticated user details
 *     description: Retrieve user details using the authorization token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information retrieved.
 *       401:
 *         description: Unauthorized.
 */
router.get("/me", protect, user);

router.post("/resend-verification", protect, csrfProtect, resendVerification);
router.post("/change-password", protect, csrfProtect, changePassword);

export default router;
