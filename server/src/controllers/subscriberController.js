import mongoose from "mongoose";
import StatusPageSubscriber from "../models/StatusPageSubscriber.js";
import User from "../models/User.js";
import Monitor from "../models/Monitor.js";
import { sendVerificationMessage } from "../services/subscriberNotificationService.js";
import { FRONTEND_URL } from "../config/env.config.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const findUserBySlugOrId = async (slugOrId) => {
  let user = null;
  if (isValidObjectId(slugOrId)) {
    user = await User.findById(slugOrId);
  }
  if (!user) {
    user = await User.findOne({ statusPageSlug: slugOrId });
  }
  return user;
};

const validateTarget = (type, target) => {
  if (!target || typeof target !== "string") return false;
  const val = target.trim();
  if (val.length === 0) return false;

  switch (type) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    case "sms":
      // Accepts format like +1234567890 or 1234567890
      return /^\+?[1-9]\d{1,14}$/.test(val.replace(/[\s()-]/g, ""));
    case "slack":
    case "webhook":
      // Must be valid HTTP/HTTPS URL
      return /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(val);
    case "telegram":
      // Username or chat ID (can be numeric string or alpha username starting with or without @)
      return val.length > 2;
    default:
      return false;
  }
};

export const subscribe = async (req, res) => {
  try {
    const {
      slugOrUserId,
      type,
      target,
      monitors = [],
      digestFrequency = "none",
    } = req.body;

    if (!slugOrUserId) {
      return res
        .status(400)
        .json({ message: "Status page identifier is required" });
    }

    const user = await findUserBySlugOrId(slugOrUserId);
    if (!user) {
      return res.status(404).json({ message: "Status page owner not found" });
    }

    if (!["email", "sms", "telegram", "slack", "webhook"].includes(type)) {
      return res.status(400).json({ message: "Invalid subscription type" });
    }

    if (!validateTarget(type, target)) {
      return res
        .status(400)
        .json({ message: `Invalid target format for type: ${type}` });
    }

    const validMonitorIds = Array.isArray(monitors)
      ? monitors.filter(isValidObjectId)
      : [];

    let subscriber = await StatusPageSubscriber.findOne({
      userId: user._id,
      type,
      target: target.trim(),
    });

    if (subscriber) {
      if (subscriber.status === "verified") {
        return res.status(200).json({
          status: "verified",
          message:
            "You are already subscribed and verified for this status page.",
        });
      } else {
        subscriber.monitors = validMonitorIds;
        subscriber.digestFrequency =
          type === "email" ? digestFrequency : "none";
        subscriber.verificationCode = Math.floor(
          100000 + Math.random() * 900000,
        ).toString();
        await subscriber.save();

        await sendVerificationMessage({
          subscriber,
          statusPageTitle: user.statusPageTitle || "System Status",
        });

        return res.status(200).json({
          status: "pending",
          subscriberId: subscriber._id,
          message: "A new verification code has been dispatched.",
        });
      }
    }

    subscriber = await StatusPageSubscriber.create({
      userId: user._id,
      type,
      target: target.trim(),
      monitors: validMonitorIds,
      digestFrequency: type === "email" ? digestFrequency : "none",
    });

    await sendVerificationMessage({
      subscriber,
      statusPageTitle: user.statusPageTitle || "System Status",
    });

    res.status(201).json({
      status: "pending",
      subscriberId: subscriber._id,
      message:
        "Subscription requested. Please enter the verification code to activate.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyCode = async (req, res) => {
  try {
    const { subscriberId, code } = req.body;

    if (!subscriberId || !isValidObjectId(subscriberId)) {
      return res.status(400).json({ message: "Invalid subscriber ID" });
    }

    const subscriber = await StatusPageSubscriber.findById(subscriberId);
    if (!subscriber) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (subscriber.status === "verified") {
      return res.json({ message: "Subscription is already verified!" });
    }

    if (subscriber.verificationCode !== code?.trim()) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    subscriber.status = "verified";
    await subscriber.save();

    res.json({
      message:
        "Subscription verified successfully! You will now receive status updates.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Verification token is missing.");
    }

    const subscriber = await StatusPageSubscriber.findOne({
      verificationToken: token,
    });
    if (!subscriber) {
      return res.status(404).send("Invalid or expired verification token.");
    }

    subscriber.status = "verified";
    await subscriber.save();

    const user = await User.findById(subscriber.userId);
    const slugOrId = user ? user.statusPageSlug || user._id : "";

    res.redirect(`${FRONTEND_URL}/status/${slugOrId}?verified=true`);
  } catch (error) {
    res.status(500).send("An error occurred during verification.");
  }
};

export const getSubscriber = async (req, res) => {
  try {
    const { subscriberId } = req.params;

    if (!subscriberId || !isValidObjectId(subscriberId)) {
      return res.status(400).json({ message: "Invalid subscriber ID" });
    }

    const subscriber = await StatusPageSubscriber.findById(subscriberId)
      .populate("userId", "statusPageTitle statusPageSlug")
      .populate("monitors", "name url");

    if (!subscriber) {
      return res.status(404).json({ message: "Subscriber not found" });
    }

    res.json({ subscriber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unsubscribe = async (req, res) => {
  try {
    const { subscriberId } = req.body;

    if (!subscriberId || !isValidObjectId(subscriberId)) {
      return res.status(400).json({ message: "Invalid subscriber ID" });
    }

    const subscriber =
      await StatusPageSubscriber.findByIdAndDelete(subscriberId);
    if (!subscriber) {
      return res
        .status(404)
        .json({ message: "Subscriber not found or already unsubscribed" });
    }

    res.json({ message: "You have been unsubscribed successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
