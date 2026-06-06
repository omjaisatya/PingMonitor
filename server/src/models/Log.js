import mongoose from "mongoose";

// Destruc
const { Schema } = mongoose;

const logSchema = new Schema({
  monitorId: {
    type: Schema.Types.ObjectId,
    ref: "Monitor",
    required: true,
  },
  status: {
    type: String,
    enum: ["up", "down"],
    required: true,
  },
  statusCode: {
    type: Number,
    default: null,
  },
  responseTime: {
    type: Number,
    default: null,
  },
  region: {
    type: String,
    default: "central",
  },
  checkGroupId: {
    type: String,
    default: null,
  },
  quorum: {
    passed: { type: Boolean, default: null },
    totalRegions: { type: Number, default: 1 },
    failedRegions: { type: Number, default: 0 },
    majorityNeeded: { type: Number, default: 1 },
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  //logs automatically deleted
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800, // 7 days
  },
});

logSchema.index({ monitorId: 1, timestamp: -1 });
logSchema.index({ monitorId: 1, status: 1 });
logSchema.index({ monitorId: 1, region: 1, timestamp: -1 });
logSchema.index({ checkGroupId: 1, region: 1 });

export default mongoose.model("Log", logSchema);
