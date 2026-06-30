import mongoose from "mongoose";
import crypto from "crypto";

const { Schema } = mongoose;

const statusPageSubscriberSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Status page owner (User) is required"],
    },
    type: {
      type: String,
      enum: ["email", "sms", "telegram", "slack", "webhook"],
      required: [true, "Subscriber type is required"],
    },
    target: {
      type: String,
      trim: true,
      required: [true, "Subscriber target destination is required"],
    },
    status: {
      type: String,
      enum: ["pending", "verified"],
      default: "pending",
    },
    verificationToken: {
      type: String,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
    verificationCode: {
      type: String,
      default: () => Math.floor(100000 + Math.random() * 900000).toString(), // 6-digit code
    },
    monitors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Monitor",
      },
    ],
    digestFrequency: {
      type: String,
      enum: ["none", "daily", "weekly"],
      default: "none",
    },
    lastDigestSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

statusPageSubscriberSchema.index(
  { userId: 1, type: 1, target: 1 },
  { unique: true },
);
statusPageSubscriberSchema.index({ verificationToken: 1 });
statusPageSubscriberSchema.index({ verificationCode: 1 });

export default mongoose.model(
  "StatusPageSubscriber",
  statusPageSubscriberSchema,
);
