import mongoose from "mongoose";

const { Schema } = mongoose;

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    device: {
      type: String,
      default: "Unknown",
    },
    browser: {
      type: String,
      default: "Unknown",
    },
    operatingSystem: {
      type: String,
      default: "Unknown",
    },
    ipAddress: {
      type: String,
      default: "Unknown",
    },
    location: {
      type: String,
      default: "Unknown Location",
    },
    userAgent: {
      type: String,
      default: "",
    },
    loginAt: {
      type: Date,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    logoutAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "expired", "revoked", "logged_out"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 });

export default mongoose.model("Session", sessionSchema);
