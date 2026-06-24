import mongoose from "mongoose";

const { Schema } = mongoose;

const apiMonitorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: "ApiCollection",
      default: null,
    },
    name: {
      type: String,
      required: [true, "Monitor name is required"],
      trim: true,
    },
    url: {
      type: String,
      required: [true, "Request URL is required"],
      trim: true,
    },
    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "DELETE", "GRAPHQL"],
      default: "GET",
    },
    headers: [
      {
        key: { type: String, required: true },
        value: { type: String, default: "" },
        isSecure: { type: Boolean, default: false },
      },
    ],
    body: {
      type: String,
      default: "",
    },
    assertions: [
      {
        type: {
          type: String,
          enum: ["statusCode", "responseTime", "jsonBody", "regex", "header"],
          required: true,
        },
        property: { type: String, default: "" }, // JSON path (e.g. user.name) or Header key
        operator: {
          type: String,
          enum: ["equals", "contains", "greaterThan", "lessThan", "notEquals"],
          required: true,
        },
        target: { type: String, default: "" }, // Expected value
      },
    ],
    status: {
      type: String,
      enum: ["up", "down", "unknown"],
      default: "unknown",
    },
    interval: {
      type: Number,
      default: 10, // in minutes
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

apiMonitorSchema.index({ userId: 1 });
apiMonitorSchema.index({ collectionId: 1 });

export default mongoose.model("ApiMonitor", apiMonitorSchema);
