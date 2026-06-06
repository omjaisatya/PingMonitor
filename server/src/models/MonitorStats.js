import mongoose from "mongoose";

const { Schema } = mongoose;

const monitorStatsSchema = new Schema(
  {
    monitorId: {
      type: Schema.Types.ObjectId,
      ref: "Monitor",
      required: true,
    },
    date: {
      type: Date,
      required: true,
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
    responseTimeSum: {
      type: Number,
      default: 0,
    },
    responseTimeCount: {
      type: Number,
      default: 0,
    },
    statusCodes: {
      type: Map,
      of: Number,
      default: {},
    },
    downtimeDuration: {
      type: Number,
      default: 0, // in seconds
    },
    downtimeFrequency: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

monitorStatsSchema.index({ monitorId: 1, date: 1 }, { unique: true });

export default mongoose.model("MonitorStats", monitorStatsSchema);
