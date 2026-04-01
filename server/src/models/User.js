import mongoose from "mongoose";

//Destruct
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      required: [true, "email is required"],
      lowercase: true,
    },
    password: {
      type: String,
      minlength: 6,
      required: [true, "Password is required and minimum length 6"],
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
