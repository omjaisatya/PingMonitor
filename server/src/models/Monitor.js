import mongoose from "mongoose";

// Descruct
const { Schema } = mongoose;

const monitorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Monitor name is required"],
      trim: true,
    },
    url: {
      type: String,
      required: [true, "Url is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["up", "down", "unknown"],
      default: "unknown",
    },
    interval: {
      type: Number,
      default: 10,
    },
    // pause
    isActive: {
      type: Boolean,
      default: true,
    },
    timezone: { type: String, default: "UTC" },
    alertChannels: {
      email: { type: Boolean, default: true },
      webhook: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true },
    },
    webhookUrl: { type: String, default: "" },
    escalationEmails: [{ type: String }],
    retryLimit: { type: Number, default: 1 },
    consecutiveFailures: { type: Number, default: 0 },
    latencyThreshold: { type: Number, default: 2000 },
    lastAlertedAt: { type: Date, default: null },
    alertCooldown: { type: Number, default: 30 }, // in minutes
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: "22:00" },
      end: { type: String, default: "08:00" },
    },
    notifyOnRecovery: { type: Boolean, default: true },
    recoveryAlertDelay: { type: Number, default: 0 },
    firstRecoveredAt: { type: Date, default: null },
    regionalStatus: {
      type: Map,
      of: new Schema(
        {
          status: { type: String, enum: ["up", "down", "unknown"], default: "unknown" },
          responseTime: { type: Number, default: null },
          statusCode: { type: Number, default: null },
          checkedAt: { type: Date, default: null },
          error: { type: String, default: "" },
        },
        { _id: false },
      ),
      default: {},
    },
    lastQuorum: {
      checkGroupId: { type: String, default: null },
      totalRegions: { type: Number, default: 0 },
      failedRegions: { type: Number, default: 0 },
      majorityNeeded: { type: Number, default: 0 },
      passed: { type: Boolean, default: null },
      evaluatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

monitorSchema.index({ userId: 1 });

export default mongoose.model("Monitor", monitorSchema);
