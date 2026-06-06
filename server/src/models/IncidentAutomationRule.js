import mongoose from "mongoose";

const { Schema } = mongoose;

const incidentAutomationRuleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    monitorIds: [{ type: Schema.Types.ObjectId, ref: "Monitor" }],
    failureThreshold: { type: Number, default: 1, min: 1 },
    autoCreateIncident: { type: Boolean, default: true },
    autoResolveIncident: { type: Boolean, default: true },
    autoResolveAfterRecoveries: { type: Number, default: 1, min: 1 },
    defaultSeverity: {
      type: String,
      enum: ["minor", "major", "critical"],
      default: "major",
    },
    publishToStatusPage: { type: Boolean, default: false },
    notifyByEmail: { type: Boolean, default: true },
    subscriberEmails: [{ type: String, trim: true }],
  },
  { timestamps: true },
);

incidentAutomationRuleSchema.index({ userId: 1, enabled: 1 });

export default mongoose.model(
  "IncidentAutomationRule",
  incidentAutomationRuleSchema,
);
