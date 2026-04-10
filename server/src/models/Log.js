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
  timestamp: {
    type: Date,
    default: Date.now,
  },
  timezone: { type: String, default: "UTC" },
  //logs automatically deleted
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800, // 7 days
  },
});

export default mongoose.model("Log", logSchema);
