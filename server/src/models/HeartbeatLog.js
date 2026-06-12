import mongoose from "mongoose";

const { Schema } = mongoose;

const heartbeatLogSchema = new Schema({
  heartbeatId: {
    type: Schema.Types.ObjectId,
    ref: "Heartbeat",
    required: true,
  },
  status: {
    type: String,
    enum: ["up", "down"],
    required: true,
  },
  ip: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // logs automatically deleted after 7 days
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800, // 7 days (in seconds)
  },
});

heartbeatLogSchema.index({ heartbeatId: 1, timestamp: -1 });

export default mongoose.model("HeartbeatLog", heartbeatLogSchema);
