import mongoose from "mongoose";

const { Schema } = mongoose;

const syntheticRunSchema = new Schema(
  {
    syntheticMonitorId: {
      type: Schema.Types.ObjectId,
      ref: "SyntheticMonitor",
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
    error: {
      type: String,
      default: "",
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // execution time in ms
    },
    metrics: {
      loadTime: { type: Number, default: 0 },
      domReady: { type: Number, default: 0 },
      dns: { type: Number, default: 0 },
      tcp: { type: Number, default: 0 },
      ttfb: { type: Number, default: 0 },
    },
    consoleLogs: [
      {
        type: { type: String }, // 'log', 'info', 'warning', 'error'
        text: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    failedRequests: [
      {
        url: { type: String },
        method: { type: String },
        errorText: { type: String },
      },
    ],
    screenshotUrl: {
      type: String,
      default: "",
    },
    videoUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// TTL index to automatically prune synthetic runs after 7 days
syntheticRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
syntheticRunSchema.index({ syntheticMonitorId: 1, createdAt: -1 });

export default mongoose.model("SyntheticRun", syntheticRunSchema);
