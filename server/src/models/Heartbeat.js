import mongoose from "mongoose";

const { Schema } = mongoose;

const heartbeatSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Heartbeat name is required"],
      trim: true,
    },
    token: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["up", "down", "unknown"],
      default: "unknown",
    },
    interval: {
      type: String,
      enum: ["1min", "5min", "15min", "hourly", "daily"],
      required: true,
    },
    gracePeriod: {
      type: Number,
      default: 2, // in minutes
    },
    lastPingAt: {
      type: Date,
      default: null,
    },
    nextExpectedPingAt: {
      type: Date,
      default: null,
    },
    consecutiveMissed: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    pingCount: {
      type: Number,
      default: 0,
    },
    upCount: {
      type: Number,
      default: 0,
    },
    downCount: {
      type: Number,
      default: 0,
    },
    alertChannels: {
      email: { type: Boolean, default: true },
      webhook: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true },
    },
    webhookUrl: {
      type: String,
      default: "",
    },
    escalationEmails: [
      {
        type: String,
      },
    ],
    alertCooldown: {
      type: Number,
      default: 30, // in minutes
    },
    lastAlertedAt: {
      type: Date,
      default: null,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: "22:00" },
      end: { type: String, default: "08:00" },
    },
  },
  { timestamps: true },
);

heartbeatSchema.index({ userId: 1 });

export default mongoose.model("Heartbeat", heartbeatSchema);
