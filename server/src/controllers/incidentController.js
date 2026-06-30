import mongoose from "mongoose";
import Incident from "../models/Incident.js";
import IncidentAutomationRule from "../models/IncidentAutomationRule.js";
import Monitor from "../models/Monitor.js";
import { sendIncidentUpdateEmail } from "../services/emailService.js";
import { emitIncidentEvent } from "../services/realtimeService.js";

const openStates = ["investigating", "identified", "monitoring"];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const findIncidentForUser = async (incidentId, userId) => {
  if (!isValidObjectId(incidentId)) return null;
  return Incident.findOne({ _id: incidentId, userId })
    .populate("affectedServices.monitorId", "name url status")
    .populate("comments.authorId", "name email")
    .populate("rootCauseAnalysis.updatedBy", "name email");
};

const publish = (incident, eventName = "incident:updated") => {
  emitIncidentEvent(incident.userId, eventName, { incident });
};

const mapMonitorToService = (monitor) => ({
  monitorId: monitor._id,
  name: monitor.name,
  url: monitor.url,
  statusAtImpact: monitor.status || "unknown",
});

export const getIncidents = async (req, res) => {
  try {
    const { state = "all", page = 1, limit = 20 } = req.query;
    const query = { userId: req.user._id };

    if (state === "open") query.state = { $in: openStates };
    if (["investigating", "identified", "monitoring", "resolved"].includes(state)) {
      query.state = state;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("affectedServices.monitorId", "name url status"),
      Incident.countDocuments(query),
    ]);

    res.json({
      incidents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.max(1, Math.ceil(total / Number(limit))),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getIncidentById = async (req, res) => {
  try {
    const incident = await findIncidentForUser(req.params.id, req.user._id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });
    res.json({ incident });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createIncident = async (req, res) => {
  try {
    const {
      title,
      summary = "",
      severity = "major",
      state = "investigating",
      monitorIds = [],
      isPublic = false,
      emailSubscribers = [],
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Incident title is required" });
    }

    const monitors = await Monitor.find({
      _id: { $in: monitorIds.filter(isValidObjectId) },
      userId: req.user._id,
    });

    const incident = await Incident.create({
      userId: req.user._id,
      title,
      summary,
      severity,
      state,
      source: "manual",
      isPublic,
      emailSubscribers,
      affectedServices: monitors.map(mapMonitorToService),
      resolvedAt: state === "resolved" ? new Date() : null,
      timeline: [
        {
          type: "created",
          message: `Incident created by ${req.user.name || req.user.email}.`,
          actorType: "user",
          actorId: req.user._id,
        },
      ],
    });

    publish(incident, "incident:created");
    res.status(201).json({ message: "Incident created", incident });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateIncident = async (req, res) => {
  try {
    const incident = await findIncidentForUser(req.params.id, req.user._id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const allowed = ["title", "summary", "severity", "state", "isPublic", "emailSubscribers"];
    const previousState = incident.state;
    const previousSeverity = incident.severity;

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) incident[field] = req.body[field];
    });

    if (incident.state === "resolved" && previousState !== "resolved") {
      incident.resolvedAt = new Date();
    }
    if (incident.state !== "resolved") incident.resolvedAt = null;

    if (previousState !== incident.state) {
      incident.timeline.push({
        type: "state_changed",
        message: `State changed from ${previousState} to ${incident.state}.`,
        actorType: "user",
        actorId: req.user._id,
      });
    }

    if (previousSeverity !== incident.severity) {
      incident.timeline.push({
        type: "severity_changed",
        message: `Severity changed from ${previousSeverity} to ${incident.severity}.`,
        actorType: "user",
        actorId: req.user._id,
      });
    }

    await incident.save();
    publish(incident);
    res.json({ message: "Incident updated", incident });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addIncidentComment = async (req, res) => {
  try {
    const incident = await findIncidentForUser(req.params.id, req.user._id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const { body, isInternal = true } = req.body;
    if (!body?.trim()) {
      return res.status(400).json({ message: "Comment body is required" });
    }

    incident.comments.push({
      body,
      isInternal,
      authorId: req.user._id,
    });
    incident.timeline.push({
      type: "comment",
      message: isInternal ? "Internal team comment added." : "Public update added.",
      actorType: "user",
      actorId: req.user._id,
    });

    await incident.save();
    publish(incident);
    res.status(201).json({ message: "Comment added", incident });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRootCauseAnalysis = async (req, res) => {
  try {
    const incident = await findIncidentForUser(req.params.id, req.user._id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const fields = ["cause", "impact", "resolution", "prevention"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        incident.rootCauseAnalysis[field] = req.body[field];
      }
    });
    incident.rootCauseAnalysis.updatedAt = new Date();
    incident.rootCauseAnalysis.updatedBy = req.user._id;
    incident.timeline.push({
      type: "rca_updated",
      message: "Root cause analysis updated.",
      actorType: "user",
      actorId: req.user._id,
    });

    await incident.save();
    publish(incident);
    res.json({ message: "Root cause analysis updated", incident });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAffectedServices = async (req, res) => {
  try {
    const incident = await findIncidentForUser(req.params.id, req.user._id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const monitorIds = Array.isArray(req.body.monitorIds) ? req.body.monitorIds : [];
    const monitors = await Monitor.find({
      _id: { $in: monitorIds.filter(isValidObjectId) },
      userId: req.user._id,
    });

    incident.affectedServices = monitors.map(mapMonitorToService);
    incident.timeline.push({
      type: "services_updated",
      message: "Affected services mapping updated.",
      actorType: "user",
      actorId: req.user._id,
    });

    await incident.save();
    publish(incident);
    res.json({ message: "Affected services updated", incident });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendIncidentEmailUpdate = async (req, res) => {
  try {
    const incident = await findIncidentForUser(req.params.id, req.user._id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const recipients = req.body.recipients?.length
      ? req.body.recipients
      : incident.emailSubscribers;

    if (!recipients.length) {
      return res.status(400).json({ message: "No email recipients configured" });
    }

    await sendIncidentUpdateEmail({ incident, recipients });
    incident.lastEmailSentAt = new Date();
    incident.timeline.push({
      type: "email_sent",
      message: `Incident update email sent to ${recipients.length} recipient${
        recipients.length === 1 ? "" : "s"
      }.`,
      actorType: "user",
      actorId: req.user._id,
    });
    await incident.save();
    publish(incident);

    res.json({ message: "Incident update email sent", incident });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAutomationRules = async (req, res) => {
  try {
    const rules = await IncidentAutomationRule.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .populate("monitorIds", "name url status");
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const upsertAutomationRule = async (req, res) => {
  try {
    const ruleId = req.params.id;
    const payload = {
      name: req.body.name || "Incident automation",
      enabled: req.body.enabled !== false,
      monitorIds: Array.isArray(req.body.monitorIds)
        ? req.body.monitorIds.filter(isValidObjectId)
        : [],
      failureThreshold: req.body.failureThreshold || 1,
      autoCreateIncident: req.body.autoCreateIncident !== false,
      autoResolveIncident: req.body.autoResolveIncident !== false,
      autoResolveAfterRecoveries: req.body.autoResolveAfterRecoveries || 1,
      defaultSeverity: req.body.defaultSeverity || "major",
      publishToStatusPage: req.body.publishToStatusPage === true,
      notifyByEmail: req.body.notifyByEmail !== false,
      subscriberEmails: Array.isArray(req.body.subscriberEmails)
        ? req.body.subscriberEmails
        : [],
    };

    const rule =
      ruleId && isValidObjectId(ruleId)
        ? await IncidentAutomationRule.findOneAndUpdate(
            { _id: ruleId, userId: req.user._id },
            payload,
            { returnDocument: 'after' },
          )
        : await IncidentAutomationRule.create({ ...payload, userId: req.user._id });

    if (!rule) return res.status(404).json({ message: "Automation rule not found" });
    res.json({ message: "Automation rule saved", rule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
