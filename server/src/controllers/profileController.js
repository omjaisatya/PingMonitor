import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Monitor from "../models/Monitor.js";
import SyntheticMonitor from "../models/SyntheticMonitor.js";
import ApiMonitor from "../models/ApiMonitor.js";
import Heartbeat from "../models/Heartbeat.js";
import MaintenanceWindow from "../models/MaintenanceWindow.js";
import Incident from "../models/Incident.js";
import AlertLog from "../models/AlertLog.js";
import EmailLog from "../models/EmailLog.js";
import { blacklistToken } from "../../utils/tokenBlacklist.js";
import crypto from "crypto";
import { hashToken } from "../../utils/tokenCofig.js";
import { FRONTEND_URL } from "../config/env.config.js";
import { sendVerificationEmail } from "../services/emailService.js";
import cloudinary from "../config/cloudinary.js";

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
      { returnDocument: 'after' },
    ).select("-password");

    res.json({ message: "Name updated", name: user.name });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateThemePreference = async (req, res) => {
  try {
    const { themePreference } = req.body;
    const allowedThemes = ["dark", "light"];

    if (!allowedThemes.includes(themePreference)) {
      return res.status(400).json({ message: "Theme must be dark or light" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { themePreference },
      { returnDocument: 'after' },
    ).select("-password");

    res.json({
      message: "Theme preference updated",
      themePreference: user.themePreference,
    });
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
    user.isVerified = process.env.NODE_ENV === "development";
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

export const updateStatusPageSettings = async (req, res) => {
  try {
    const {
      statusPageEnabled,
      statusPageTitle,
      statusPageDescription,
      statusPageSlug,
      statusPageShowUrl,
      statusPageCandlePeriod,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (statusPageEnabled !== undefined) {
      user.statusPageEnabled = !!statusPageEnabled;
    }
    if (statusPageTitle !== undefined) {
      user.statusPageTitle = statusPageTitle.trim() || "System Status";
    }
    if (statusPageDescription !== undefined) {
      user.statusPageDescription = statusPageDescription.trim();
    }

    if (statusPageSlug !== undefined) {
      const cleanSlug = statusPageSlug.trim().toLowerCase();
      if (cleanSlug === "") {
        user.statusPageSlug = undefined;
      } else {
        const slugRegex = /^[a-z0-9-_]+$/;
        if (!slugRegex.test(cleanSlug)) {
          return res.status(400).json({
            message:
              "Slug can only contain alphanumeric characters, hyphens, and underscores",
          });
        }

        if (mongoose.Types.ObjectId.isValid(cleanSlug)) {
          return res.status(400).json({
            message: "Slug cannot be a valid database ID format",
          });
        }

        const existing = await User.findOne({
          statusPageSlug: cleanSlug,
          _id: { $ne: user._id },
        });
        if (existing) {
          return res
            .status(400)
            .json({ message: "This slug is already taken" });
        }
        user.statusPageSlug = cleanSlug;
      }
    }

    if (statusPageShowUrl !== undefined) {
      user.statusPageShowUrl = !!statusPageShowUrl;
    }

    if (statusPageCandlePeriod !== undefined) {
      const allowedPeriods = ["minutes", "day", "month"];
      if (!allowedPeriods.includes(statusPageCandlePeriod)) {
        return res.status(400).json({
          message: "Candle period must be minutes, day, or month",
        });
      }
      user.statusPageCandlePeriod = statusPageCandlePeriod;
    }

    await user.save();
    res.json({
      message: "Status page settings updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified:
          process.env.NODE_ENV === "development" ? true : user.isVerified,
        statusPageEnabled: user.statusPageEnabled,
        statusPageTitle: user.statusPageTitle,
        statusPageDescription: user.statusPageDescription,
        statusPageSlug: user.statusPageSlug,
        statusPageShowUrl: user.statusPageShowUrl,
        statusPageCandlePeriod: user.statusPageCandlePeriod,
        themePreference: user.themePreference || "dark",
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.avatar && user.avatar.publicId) {
      try {
        await cloudinary.uploader.destroy(user.avatar.publicId);
      } catch (err) {
        console.error(
          "Failed to delete old avatar from Cloudinary:",
          err.message,
        );
      }
    }

    const uploadToCloudinary = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "pingmonitor/avatars",
            resource_type: "image",
            transformation: [
              { width: 300, height: 300, crop: "limit" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );
        stream.end(fileBuffer);
      });
    };

    const result = await uploadToCloudinary(req.file.buffer);

    user.avatar = {
      url: result.secure_url,
      publicId: result.public_id,
    };
    await user.save();

    res.json({
      message: "Avatar uploaded successfully",
      avatar: user.avatar,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.avatar && user.avatar.publicId) {
      try {
        await cloudinary.uploader.destroy(user.avatar.publicId);
      } catch (err) {
        console.error("Failed to delete avatar from Cloudinary:", err.message);
      }
    }

    user.avatar = {
      url: null,
      publicId: null,
    };
    await user.save();

    res.json({
      message: "Avatar deleted successfully",
      avatar: user.avatar,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

import { generateReportData } from "../services/reportService.js";
import { sendScheduledReportEmail } from "../services/emailService.js";

export const updateEmailReportSettings = async (req, res) => {
  try {
    const { enabled, frequency, deliveryTime, timezone, sections } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.emailReportConfig) {
      user.emailReportConfig = {};
    }

    if (enabled !== undefined) user.emailReportConfig.enabled = !!enabled;
    if (frequency) user.emailReportConfig.frequency = frequency;
    if (deliveryTime) user.emailReportConfig.deliveryTime = deliveryTime;
    if (timezone) user.emailReportConfig.timezone = timezone;
    if (sections) {
      user.emailReportConfig.sections = {
        ...user.emailReportConfig.sections,
        ...sections,
      };
    }

    await user.save();

    res.json({
      message: "Scheduled email report settings updated",
      emailReportConfig: user.emailReportConfig,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendTestEmailReport = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const config = user.emailReportConfig || {
      frequency: "weekly",
      sections: {
        uptime: true,
        incidents: true,
        responseTime: true,
        ssl: true,
        heartbeats: true,
      },
    };

    const reportData = await generateReportData(
      user._id,
      config.sections,
      config.frequency,
    );

    await sendScheduledReportEmail({
      email: user.email,
      name: user.name,
      frequency: config.frequency,
      reportData,
    });

    res.json({ message: "Test report sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportAllUserData = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const userProfile = await User.findById(userId).select(
      "-password -refreshTokenHash -emailVerificationTokenHash -forgotPasswordTokenHash",
    );

    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    const monitors = await Monitor.find({ userId });
    const syntheticMonitors = await SyntheticMonitor.find({ userId });
    const apiMonitors = await ApiMonitor.find({ userId });
    const heartbeats = await Heartbeat.find({ userId });
    const maintenanceWindows = await MaintenanceWindow.find({ userId });
    const incidents = await Incident.find({ userId });

    const monitorIds = monitors.map((m) => m._id);
    const alertLogs = await AlertLog.find({ monitorId: { $in: monitorIds } })
      .sort({ timestamp: -1 })
      .populate("monitorId", "name url");

    const emailLogs = await EmailLog.find({ userId })
      .sort({ timestamp: -1 })
      .populate("monitorId", "name url");

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: userProfile,
      monitors,
      syntheticMonitors,
      apiMonitors,
      heartbeats,
      maintenanceWindows,
      incidents,
      alertLogs,
      emailLogs,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="pingmonitor_export_${userProfile.name
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}_${new Date().toISOString().split("T")[0]}.json"`,
    );

    return res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
