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
    // auth security
    refreshTokenHash: { type: String, default: null },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    // account state
    isVerified: { type: Boolean, default: false },
    isDeactivated: { type: Boolean, default: false },
    deactivatedAt: { type: Date, default: null },

    // status page settings
    statusPageEnabled: { type: Boolean, default: true },
    statusPageTitle: { type: String, default: "System Status" },
    statusPageDescription: {
      type: String,
      default: "Live status of our services.",
    },
    statusPageSlug: { type: String, unique: true, sparse: true },

    themePreference: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },
    avatar: {
      url: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
    },
    emailReportConfig: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "weekly",
      },
      deliveryTime: { type: String, default: "09:00" }, // HH:mm format
      timezone: { type: String, default: "UTC" },
      sections: {
        uptime: { type: Boolean, default: true },
        incidents: { type: Boolean, default: true },
        responseTime: { type: Boolean, default: true },
        ssl: { type: Boolean, default: true },
        heartbeats: { type: Boolean, default: true },
      },
      lastReportSentAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
