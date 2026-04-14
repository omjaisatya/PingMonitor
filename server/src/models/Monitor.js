import mongoose from "mongoose";

// Descruct
const { Schema } = mongoose;

const monitorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Monitor name is required"],
      trim: true,
    },
    url: {
      type: String,
      required: [true, "Url is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["up", "down", "unknown"],
      default: "unknown",
    },
    interval: {
      type: Number,
      default: 10,
    },
    timezone: { type: String, default: "UTC" },
  },
  { timestamps: true },
);

export default mongoose.model("Monitor", monitorSchema);
