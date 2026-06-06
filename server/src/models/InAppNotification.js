import mongoose from "mongoose";

const { Schema } = mongoose;

const inAppNotificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
inAppNotificationSchema.index({ userId: 1, isRead: 1, timestamp: -1 });

export default mongoose.model("InAppNotification", inAppNotificationSchema);
