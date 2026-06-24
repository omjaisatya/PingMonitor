import mongoose from "mongoose";

const { Schema } = mongoose;

const syntheticMonitorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Synthetic monitor name is required"],
      trim: true,
    },
    script: {
      type: String,
      required: [true, "Playwright script is required"],
    },
    status: {
      type: String,
      enum: ["up", "down", "unknown"],
      default: "unknown",
    },
    interval: {
      type: Number,
      default: 15, // in minutes
    },
    timeout: {
      type: Number,
      default: 30000, // in milliseconds
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    consecutiveFailures: {
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
    lastRunAt: {
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
  { timestamps: true }
);

syntheticMonitorSchema.index({ userId: 1 });

export default mongoose.model("SyntheticMonitor", syntheticMonitorSchema);
