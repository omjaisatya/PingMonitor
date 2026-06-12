import mongoose from "mongoose";

const maintenanceWindowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      required: true,
      default: "UTC",
    },
    recurringFrequency: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed"],
      default: "scheduled",
    },
    monitors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Monitor",
      },
    ],
    syntheticMonitors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SyntheticMonitor",
      },
    ],
    apiMonitors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ApiMonitor",
      },
    ],
    heartbeats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Heartbeat",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("MaintenanceWindow", maintenanceWindowSchema);
