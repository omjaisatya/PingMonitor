import Incident from "../models/Incident.js";
import IncidentAutomationRule from "../models/IncidentAutomationRule.js";
import User from "../models/User.js";
import { sendIncidentUpdateEmail } from "./emailService.js";
import { emitIncidentEvent } from "./realtimeService.js";
import { notifyStatusPageSubscribers } from "./subscriberNotificationService.js";

const openStates = ["investigating", "identified", "monitoring"];

const inferSeverity = (monitor, statusCode) => {
  if (!statusCode) return "critical";
  if (statusCode >= 500) return "critical";
  if ((monitor.consecutiveFailures || 0) >= 3) return "major";
  return "minor";
};

const getRuleForMonitor = async (monitor) => {
  return IncidentAutomationRule.findOne({
    userId: monitor.userId,
    enabled: true,
    $or: [{ monitorIds: monitor._id }, { monitorIds: { $size: 0 } }],
  }).sort({ updatedAt: -1 });
};

const getSubscribers = async (monitor, rule) => {
  const user = await User.findById(monitor.userId).select("email isVerified");
  const subscribers = new Set([
    ...(rule?.subscriberEmails || []),
    ...(monitor.escalationEmails || []),
  ]);
  if (user?.email && user.isVerified !== false) subscribers.add(user.email);
  return [...subscribers].filter(Boolean);
};

const broadcastIncident = (incident, eventName = "incident:updated") => {
  emitIncidentEvent(incident.userId, eventName, { incident });
};

export const handleMonitorFailureIncident = async ({
  monitor,
  statusCode,
  responseTime,
  failureCount,
}) => {
  const rule = await getRuleForMonitor(monitor);
  const threshold = rule?.failureThreshold || monitor.retryLimit || 1;

  if (rule && !rule.autoCreateIncident) return null;
  if (failureCount < threshold) return null;

  const existing = await Incident.findOne({
    userId: monitor.userId,
    state: { $in: openStates },
    "affectedServices.monitorId": monitor._id,
  });

  if (existing) {
    existing.recoveryChecks = 0;
    existing.timeline.push({
      type: "automation",
      message: `${monitor.name} is still failing. Recovery counter reset.`,
      metadata: { statusCode, responseTime, failureCount },
    });
    await existing.save();
    broadcastIncident(existing);
    return existing;
  }

  const subscribers = await getSubscribers(monitor, rule);
  const severity = rule?.defaultSeverity || inferSeverity(monitor, statusCode);

  const incident = await Incident.create({
    userId: monitor.userId,
    title: `${monitor.name} outage`,
    summary: `Automated incident created after ${failureCount} failed check${
      failureCount === 1 ? "" : "s"
    }.`,
    severity,
    state: "investigating",
    source: "automatic",
    isPublic: rule?.publishToStatusPage ?? false,
    autoResolveAfterRecoveries:
      rule?.autoResolveAfterRecoveries || monitor.recoveryAlertDelay || 1,
    emailSubscribers: subscribers,
    affectedServices: [
      {
        monitorId: monitor._id,
        name: monitor.name,
        url: monitor.url,
        statusAtImpact: "down",
      },
    ],
    timeline: [
      {
        type: "created",
        message: `Incident opened automatically because ${monitor.name} is down.`,
        metadata: { statusCode, responseTime, failureCount },
      },
    ],
  });

  if ((rule?.notifyByEmail ?? true) && subscribers.length > 0) {
    await sendIncidentUpdateEmail({
      incident,
      recipients: subscribers,
      subjectPrefix: "Incident opened",
    });
    incident.lastEmailSentAt = new Date();
    incident.timeline.push({
      type: "email_sent",
      message: `Incident opened email sent to ${subscribers.length} subscriber${
        subscribers.length === 1 ? "" : "s"
      }.`,
    });
    await incident.save();
  }

  broadcastIncident(incident, "incident:created");
  notifyStatusPageSubscribers({ incident, eventType: "created" }).catch((err) =>
    console.error("Failed to notify subscribers:", err)
  );
  return incident;
};

export const handleMonitorRecoveryIncident = async ({
  monitor,
  statusCode,
  responseTime,
  downtimeSec = 0,
}) => {
  const incident = await Incident.findOne({
    userId: monitor.userId,
    state: { $in: openStates },
    "affectedServices.monitorId": monitor._id,
  }).sort({ updatedAt: -1 });

  if (!incident) return null;

  const rule = await getRuleForMonitor(monitor);
  if (rule && !rule.autoResolveIncident) {
    incident.state = "monitoring";
    incident.timeline.push({
      type: "state_changed",
      message: `${monitor.name} recovered. Incident moved to monitoring.`,
      metadata: { statusCode, responseTime, downtimeSec },
    });
    await incident.save();
    broadcastIncident(incident);
    return incident;
  }

  incident.recoveryChecks += 1;
  const requiredRecoveries =
    incident.autoResolveAfterRecoveries ||
    rule?.autoResolveAfterRecoveries ||
    1;

  if (incident.recoveryChecks >= requiredRecoveries) {
    incident.state = "resolved";
    incident.resolvedAt = new Date();
    incident.timeline.push({
      type: "auto_resolved",
      message: `${monitor.name} recovered. Incident resolved automatically.`,
      metadata: { statusCode, responseTime, downtimeSec },
    });
  } else {
    incident.state = "monitoring";
    incident.timeline.push({
      type: "state_changed",
      message: `${monitor.name} recovered. Monitoring for stability (${incident.recoveryChecks}/${requiredRecoveries}).`,
      metadata: { statusCode, responseTime, downtimeSec },
    });
  }

  await incident.save();

  if (incident.emailSubscribers.length > 0) {
    await sendIncidentUpdateEmail({
      incident,
      recipients: incident.emailSubscribers,
      subjectPrefix:
        incident.state === "resolved" ? "Incident resolved" : "Incident update",
    });
  }

  broadcastIncident(incident);
  notifyStatusPageSubscribers({
    incident,
    eventType: incident.state === "resolved" ? "resolved" : "updated",
  }).catch((err) => console.error("Failed to notify subscribers:", err));
  return incident;
};

export const createDefaultIncidentRule = async (userId) => {
  const existing = await IncidentAutomationRule.findOne({ userId });
  if (existing) return existing;

  return IncidentAutomationRule.create({
    userId,
    name: "Default monitor failure automation",
  });
};
