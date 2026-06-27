import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  generateTokenPair,
  hashToken,
  verifyRefreshToken,
} from "../../utils/tokenCofig.js";
import crypto from "crypto";
import { blacklistToken } from "../../utils/tokenBlacklist.js";
import { FRONTEND_URL } from "../config/env.config.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/emailService.js";

const REFRESH_TOKEN_COOKIE_NAME = "pm_refresh_token";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 30 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL = 15 * 60 * 1000;
const VERIFY_TOKEN_TTL = 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";

const sameSiteCookieOption = () => (isProduction ? "none" : "strict");

const refreshCookieOptions = (maxAge = REFRESH_COOKIE_MAX_AGE) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: sameSiteCookieOption(),
  maxAge,
  path: "/",
  priority: "high",
});

const generateCsrfToken = () => crypto.randomBytes(32).toString("hex");
const generatePublicToken = () => crypto.randomBytes(32).toString("hex");

const setCsrfCookie = (res) => {
  const csrfToken = generateCsrfToken();
  res.cookie("pm_csrf_token", csrfToken, {
    secure: isProduction,
    sameSite: sameSiteCookieOption(),
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: "/",
    priority: "high",
  });
  return csrfToken;
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: sameSiteCookieOption(),
    path: "/",
    priority: "high",
  });
};

const clearCsrfCookie = (res) => {
  res.clearCookie("pm_csrf_token", {
    secure: isProduction,
    sameSite: sameSiteCookieOption(),
    path: "/",
    priority: "high",
  });
};

const buildClientUrl = (path) => {
  const baseUrl = FRONTEND_URL || "http://localhost:5173";
  return `${baseUrl.replace(/\/$/, "")}${path}`;
};

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  isVerified: process.env.NODE_ENV === "development" ? true : user.isVerified,
  createdAt: user.createdAt,
  statusPageEnabled: user.statusPageEnabled,
  statusPageTitle: user.statusPageTitle,
  statusPageDescription: user.statusPageDescription,
  statusPageSlug: user.statusPageSlug,
  statusPageShowUrl: user.statusPageShowUrl !== undefined ? user.statusPageShowUrl : true,
  statusPageCandlePeriod: user.statusPageCandlePeriod || "minutes",
  themePreference: user.themePreference || "dark",
});

const sendAccountVerification = async (user) => {
  const verificationToken = generatePublicToken();
  user.emailVerificationTokenHash = hashToken(verificationToken);
  user.emailVerificationExpires = new Date(Date.now() + VERIFY_TOKEN_TTL);
  await user.save();

  await sendVerificationEmail({
    email: user.email,
    name: user.name,
    verificationUrl: buildClientUrl(`/login?verifyToken=${verificationToken}`),
  });
};

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // fetching user if already register in db
    const existUser = await User.findOne({ email });
    if (existUser) {
      return res
        .status(400)
        .json({ message: "Email is already used, try signin" });
    }

    // todo: implement seperate reusable hashing password
    // hashing password (Encrypt)
    const hashPass = await bcrypt.hash(password, 12);

    // storing new user in db
    const newUser = await User.create({
      name,
      email,
      password: hashPass,
      isVerified: process.env.NODE_ENV === "development",
    });

    const { accessToken, refreshToken } = generateTokenPair(newUser._id);

    newUser.refreshTokenHash = hashToken(refreshToken);
    try {
      await sendAccountVerification(newUser);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError.message);
      await newUser.save();
    }

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshCookieOptions());
    const csrfToken = setCsrfCookie(res);

    res.status(201).json({
      message: "Successfully created account",
      token: accessToken,
      csrfToken,
      newUser: serializeUser(newUser),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid Credential, try signup" });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account locked. Try again in ${minutesLeft} minutes`,
      });
    }

    // matching user password from db
    const matchPass = await bcrypt.compare(password, user.password);
    if (!matchPass) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION);
        user.failedLoginAttempts = 0;
        await user.save();
        return res.status(423).json({
          message:
            "Account locked due to too many failed attempts. Try again in 30 minutes",
        });
      }

      await user.save();

      const attemptsRemaining = MAX_ATTEMPTS - user.failedLoginAttempts;
      return res.status(401).json({
        message: "Invalid credentials",
        attemptsRemaining: Math.max(0, attemptsRemaining),
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    if (user.isDeactivated) {
      user.isDeactivated = false;
      user.deactivatedAt = null;
    }

    const { refreshToken, accessToken } = generateTokenPair(user._id);
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshCookieOptions());
    const csrfToken = setCsrfCookie(res);

    res.status(200).json({
      message: "Successfully login",
      token: accessToken,
      csrfToken,
      user: serializeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const refreshTokenEP = async (req, res) => {
  try {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const incomingHash = hashToken(refreshToken);
    if (user.refreshTokenHash !== incomingHash) {
      user.refreshTokenHash = null;
      await user.save();
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Refresh token reuse detected" });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(
      user._id,
    );
    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      newRefreshToken,
      refreshCookieOptions(),
    );

    const csrfToken = setCsrfCookie(res);

    res.status(200).json({
      message: "Token refreshed",
      token: accessToken,
      csrfToken,
    });
  } catch (error) {
    // clear refresh token
    clearRefreshCookie(res);
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

const logout = async (req, res) => {
  try {
    if (req.token) {
      blacklistToken(req.token);
    }

    if (req.user) {
      req.user.refreshTokenHash = null;
      await req.user.save();
    }

    clearRefreshCookie(res);
    clearCsrfCookie(res);

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.json({ message: error.message });
  }
};

const user = async (req, res) => {
  res.json({ user: serializeUser(req.user) });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const resetToken = generatePublicToken();
      user.passwordResetTokenHash = hashToken(resetToken);
      user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL);
      await user.save();

      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl: buildClientUrl(`/login?resetToken=${resetToken}`),
      });
    }

    res.json({
      message: "If that email exists, a password reset link has been sent",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or expired" });
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    user.refreshTokenHash = null;
    await user.save();

    clearRefreshCookie(res);
    clearCsrfCookie(res);

    res.json({ message: "Password reset successfully. Please sign in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Verification link is invalid or expired" });
    }

    user.isVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.json({ message: "Your account is already verified" });
    }

    await sendAccountVerification(user);
    res.json({ message: "Verification email sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new password are required" });
    }

    const user = await User.findById(userId);

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    user.refreshTokenHash = null;
    await user.save();

    if (req.token) {
      blacklistToken(req.token); // blacklist current access token too
    }

    clearRefreshCookie(res);
    clearCsrfCookie(res);

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  login,
  signup,
  logout,
  refreshTokenEP,
  user,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
