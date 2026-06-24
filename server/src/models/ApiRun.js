import mongoose from "mongoose";

const { Schema } = mongoose;

const apiRunSchema = new Schema(
  {
    apiMonitorId: {
      type: Schema.Types.ObjectId,
      ref: "ApiMonitor",
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
    request: {
      url: { type: String, required: true },
      method: { type: String, required: true },
      headers: { type: Schema.Types.Mixed, default: {} },
      body: { type: String, default: "" },
    },
    response: {
      status: { type: Number },
      headers: { type: Schema.Types.Mixed, default: {} },
      body: { type: String, default: "" },
      responseTime: { type: Number }, // in ms
    },
    assertionResults: [
      {
        assertion: {
          type: { type: String, required: true },
          property: { type: String, default: "" },
          operator: { type: String, required: true },
          target: { type: String, default: "" },
        },
        passed: { type: Boolean, required: true },
        actualValue: { type: String, default: "" },
      },
    ],
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // execution runtime in ms
    },
    error: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Prune API runs after 7 days automatically
apiRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
apiRunSchema.index({ apiMonitorId: 1, createdAt: -1 });

export default mongoose.model("ApiRun", apiRunSchema);
