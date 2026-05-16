import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { blacklistToken } from "../../utils/tokenBlacklist.js";

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
    // invalidate all sessions since email changed
    user.refreshTokenHash = null;
    await user.save();

    if (req.token) blacklistToken(req.token);

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

    res.json({ message: "Account permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
