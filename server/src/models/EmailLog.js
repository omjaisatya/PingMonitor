import mongoose from "mongoose";

const { Schema } = mongoose;

const emailLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    monitorId: {
      type: Schema.Types.ObjectId,
      ref: "Monitor",
      default: null,
    },
    email: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed", "bounced"],
      default: "sent",
    },
    errorReason: {
      type: String,
      default: null,
    },
    retryStatus: {
      type: String,
      enum: ["none", "pending", "retrying", "retried", "failed"],
      default: "none",
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

emailLogSchema.index({ userId: 1, timestamp: -1 });
emailLogSchema.index({ monitorId: 1, timestamp: -1 });
emailLogSchema.index({ status: 1, retryStatus: 1 });

export default mongoose.model("EmailLog", emailLogSchema);
