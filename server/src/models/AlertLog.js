import mongoose from "mongoose";

const { Schema } = mongoose;

const alertLogSchema = new Schema(
  {
    monitorId: {
      type: Schema.Types.ObjectId,
      ref: "Monitor",
      required: true,
    },
    status: {
      type: String,
      enum: ["up", "down", "slow"],
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
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    delivery: {
      email: {
        type: String,
        enum: ["pending", "sent", "failed", "muted", "disabled"],
        default: "pending",
      },
      webhook: {
        type: String,
        enum: ["pending", "sent", "failed", "muted", "disabled"],
        default: "pending",
      },
      inApp: {
        type: String,
        enum: ["pending", "sent", "failed", "muted", "disabled"],
        default: "pending",
      },
    },
    errorDetails: {
      email: { type: String, default: null },
      webhook: { type: String, default: null },
    },
  },
  { timestamps: true },
);

alertLogSchema.index({ monitorId: 1, timestamp: -1 });

export default mongoose.model("AlertLog", alertLogSchema);
