import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { blacklistToken } from "../../utils/tokenBlacklist.js";
import crypto from "crypto";
import { hashToken } from "../../utils/tokenCofig.js";
import { FRONTEND_URL } from "../config/env.config.js";
import { sendVerificationEmail } from "../services/emailService.js";

const isProduction = process.env.NODE_ENV === "production";
const VERIFY_TOKEN_TTL = 24 * 60 * 60 * 1000;
const sameSiteCookieOption = () => (isProduction ? "none" : "strict");

const clearRefreshCookie = (res) => {
  res.clearCookie("pm_refresh_token", {
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
  const baseUrl = FRONTEND_URL;
  return `${baseUrl.replace(/\/$/, "")}${path}`;
};

const sendAccountVerification = async (user) => {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationTokenHash = hashToken(verificationToken);
  user.emailVerificationExpires = new Date(Date.now() + VERIFY_TOKEN_TTL);
  await user.save();

  await sendVerificationEmail({
    email: user.email,
    name: user.name,
    verificationUrl: buildClientUrl(`/login?verifyToken=${verificationToken}`),
  });
};

export const updateName = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Name must be at least 2 characters" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true },
    ).select("-password");

    res.json({ message: "Name updated", name: user.name });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEmail = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and current password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const user = await User.findById(req.user._id);

    if (email.toLowerCase() === user.email) {
      return res.status(400).json({ message: "That is already your email" });
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const taken = await User.findOne({ email: email.toLowerCase() });
    if (taken) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    user.email = email.toLowerCase();
    user.isVerified = false;
    // invalidate all sessions since email changed
    user.refreshTokenHash = null;
    try {
      await sendAccountVerification(user);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError.message);
      await user.save();
    }

    if (req.token) blacklistToken(req.token);
    clearRefreshCookie(res);
    clearCsrfCookie(res);

    res.json({ message: "Email updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deactivateAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    user.isDeactivated = true;
    user.deactivatedAt = new Date();
    user.refreshTokenHash = null;
    await user.save();

    if (req.token) blacklistToken(req.token);

    clearRefreshCookie(res);
    clearCsrfCookie(res);

    res.json({ message: "Account deactivated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    if (req.token) blacklistToken(req.token);

    await User.findByIdAndDelete(req.user._id);

    // TODO: cascade-delete monitors and any related data here
    // await Monitor.deleteMany({ userId: req.user._id });

    clearRefreshCookie(res);
    clearCsrfCookie(res);

    res.json({ message: "Account permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
