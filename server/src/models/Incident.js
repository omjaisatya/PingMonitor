import mongoose from "mongoose";

const { Schema } = mongoose;

const timelineSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "created",
        "state_changed",
        "severity_changed",
        "comment",
        "rca_updated",
        "services_updated",
        "email_sent",
        "auto_resolved",
        "automation",
      ],
      required: true,
    },
    message: { type: String, required: true, trim: true },
    actorType: {
      type: String,
      enum: ["system", "user"],
      default: "system",
    },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const commentSchema = new Schema(
  {
    body: { type: String, required: true, trim: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isInternal: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const affectedServiceSchema = new Schema(
  {
    monitorId: { type: Schema.Types.ObjectId, ref: "Monitor", required: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, default: "", trim: true },
    statusAtImpact: {
      type: String,
      enum: ["up", "down", "unknown"],
      default: "unknown",
    },
  },
  { _id: false },
);

const incidentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: "", trim: true },
    severity: {
      type: String,
      enum: ["minor", "major", "critical"],
      default: "major",
    },
    state: {
      type: String,
      enum: ["investigating", "identified", "monitoring", "resolved"],
      default: "investigating",
      index: true,
    },
    source: {
      type: String,
      enum: ["automatic", "manual"],
      default: "manual",
    },
    isPublic: { type: Boolean, default: false },
    affectedServices: { type: [affectedServiceSchema], default: [] },
    rootCauseAnalysis: {
      cause: { type: String, default: "" },
      impact: { type: String, default: "" },
      resolution: { type: String, default: "" },
      prevention: { type: String, default: "" },
      updatedAt: { type: Date, default: null },
      updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    comments: { type: [commentSchema], default: [] },
    timeline: { type: [timelineSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
    autoResolveAfterRecoveries: { type: Number, default: 1 },
    recoveryChecks: { type: Number, default: 0 },
    emailSubscribers: [{ type: String, trim: true }],
    lastEmailSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

incidentSchema.index({ userId: 1, state: 1, updatedAt: -1 });
incidentSchema.index({ userId: 1, isPublic: 1, startedAt: -1 });
incidentSchema.index({ "affectedServices.monitorId": 1, state: 1 });

export default mongoose.model("Incident", incidentSchema);
