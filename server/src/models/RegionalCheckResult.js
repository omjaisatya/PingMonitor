import mongoose from "mongoose";

const { Schema } = mongoose;

const regionalCheckResultSchema = new Schema(
  {
    checkGroupId: { type: String, required: true },
    monitorId: {
      type: Schema.Types.ObjectId,
      ref: "Monitor",
      required: true,
    },
    region: {
      type: String,
      enum: ["us", "europe", "asia", "australia"],
      required: true,
    },
    status: {
      type: String,
      enum: ["up", "down"],
      required: true,
    },
    statusCode: { type: Number, default: null },
    responseTime: { type: Number, default: null },
    error: { type: String, default: "" },
    checkedAt: { type: Date, default: Date.now },
    workerId: { type: String, default: "" },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800,
    },
  },
  { timestamps: true },
);

regionalCheckResultSchema.index(
  { checkGroupId: 1, region: 1 },
  { unique: true },
);
regionalCheckResultSchema.index({ monitorId: 1, checkedAt: -1 });
regionalCheckResultSchema.index({ monitorId: 1, region: 1, checkedAt: -1 });

export default mongoose.model("RegionalCheckResult", regionalCheckResultSchema);
