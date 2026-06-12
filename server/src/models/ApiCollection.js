import mongoose from "mongoose";

const { Schema } = mongoose;

const apiCollectionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Collection name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    variables: [
      {
        key: { type: String, required: true },
        value: { type: String, default: "" },
        isSecure: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

apiCollectionSchema.index({ userId: 1 });

export default mongoose.model("ApiCollection", apiCollectionSchema);
