import axios from "axios";
import { Resend } from "resend";
import Monitor from "../models/Monitor.js";
import User from "../models/User.js";
import MonitorStats from "../models/MonitorStats.js";
import AlertLog from "../models/AlertLog.js";
import EmailLog from "../models/EmailLog.js";
import InAppNotification from "../models/InAppNotification.js";
import sendAlert, { getAlertTemplate } from "./emailService.js";
import { RESEND_API_KEY, SENDER_EMAIL } from "../config/env.config.js";
import { emitIncidentEvent } from "./realtimeService.js";

export const isInQuietHours = (quietHours, timezone = "UTC") => {
  if (!quietHours || !quietHours.enabled) return false;

  try {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    const { start, end } = quietHours;
    if (!start || !end) return false;

    if (start < end) return timeString >= start && timeString <= end;
    return timeString >= start || timeString <= end;
  } catch (err) {
    console.error("Quiet hours evaluation failed:", err);
    return false;
  }
};

export const dispatchNotifications = async (
  monitor,
  eventType,
  statusCode,
  responseTime,
  message,
  downtimeSec = 0,
) => {
  try {
    if (eventType === "down" || eventType === "slow") {
      if (monitor.lastAlertedAt && monitor.alertCooldown) {
        const elapsedMin =
          (Date.now() - new Date(monitor.lastAlertedAt).getTime()) /
          (1000 * 60);
        if (elapsedMin < monitor.alertCooldown) return;
      }
    }

    const delivery = {
      email: monitor.alertChannels?.email ? "pending" : "disabled",
      webhook: monitor.alertChannels?.webhook ? "pending" : "disabled",
      inApp: monitor.alertChannels?.inApp ? "pending" : "disabled",
    };
    const errorDetails = { email: null, webhook: null };

    if (isInQuietHours(monitor.quietHours, monitor.timezone)) {
      if (delivery.email === "pending") delivery.email = "muted";
      if (delivery.webhook === "pending") delivery.webhook = "muted";
      if (delivery.inApp === "pending") delivery.inApp = "muted";
    }

    if (delivery.webhook === "pending" && monitor.webhookUrl) {
      try {
        await axios.post(
          monitor.webhookUrl,
          {
            event: `monitor.${eventType}`,
            monitor: { id: monitor._id, name: monitor.name, url: monitor.url },
            incident: {
              status: eventType,
              statusCode,
              responseTime,
              message,
              downtimeSec,
              timestamp: new Date().toISOString(),
            },
          },
          { timeout: 3000 },
        );
        delivery.webhook = "sent";
      } catch (err) {
        delivery.webhook = "failed";
        errorDetails.webhook = err.message;
      }
    } else if (delivery.webhook === "pending") {
      delivery.webhook = "disabled";
    }

    if (delivery.inApp === "pending") {
      try {
        await InAppNotification.create({
          userId: monitor.userId,
          monitorId: monitor._id,
          status: eventType,
          message,
        });
        delivery.inApp = "sent";
      } catch {
        delivery.inApp = "failed";
      }
    }

    if (delivery.email === "pending") {
      try {
        const user = await User.findById(monitor.userId);
        if (user && user.isVerified !== false) {
          const recipients = [user.email, ...(monitor.escalationEmails || [])];
          const formateDate = new Date().toLocaleString("en-US", {
            timeZone: monitor.timezone,
            dateStyle: "medium",
            timeStyle: "medium",
          });

          await sendAlert({
            monitorName: monitor.name,
            url: monitor.url,
            statusCode,
            responseTime,
            email: recipients,
            formateDate,
            monitorId: monitor._id,
            alertType: eventType,
            latencyThreshold: monitor.latencyThreshold || 2000,
          });
          delivery.email = "sent";
        } else {
          delivery.email = "disabled";
        }
      } catch (err) {
        delivery.email = "failed";
        errorDetails.email = err.message;
      }
    }

    if (
      (delivery.email === "sent" ||
        delivery.webhook === "sent" ||
        delivery.inApp === "sent") &&
      eventType !== "recovered"
    ) {
      await Monitor.findByIdAndUpdate(monitor._id, {
        lastAlertedAt: new Date(),
      });
    }

    await AlertLog.create({
      monitorId: monitor._id,
      status: eventType,
      statusCode,
      responseTime,
      message,
      timestamp: new Date(),
      delivery,
      errorDetails,
    });

    try {
      emitIncidentEvent(monitor.userId, "alert:logged", {
        monitorId: monitor._id.toString(),
        status: eventType,
        statusCode,
        responseTime,
        message,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error("Failed to emit WebSocket alert:logged event:", err);
    }
  } catch (err) {
    console.error("Failed to run dispatch process:", err.message);
  }
};

export const calculateDowntime = async (monitorId) => {
  try {
    const lastDownAlert = await AlertLog.findOne({
      monitorId,
      status: "down",
    }).sort({ timestamp: -1 });

    if (lastDownAlert) {
      const downtimeSec = Math.round(
        (Date.now() - lastDownAlert.timestamp.getTime()) / 1000,
      );

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await MonitorStats.findOneAndUpdate(
        { monitorId, date: today },
        { $inc: { downtimeDuration: downtimeSec } },
        { upsert: true },
      );
      return downtimeSec;
    }
  } catch (err) {
    console.error("Downtime duration calculation failed:", err);
  }
  return 0;
};

export const updateDailyStats = async (
  monitorId,
  status,
  responseTime,
  statusCode,
  previousStatus,
) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const isTransitionToDown = status === "down" && previousStatus !== "down";
    const updateObj = {
      $inc: {
        pingCount: 1,
        upCount: status === "up" ? 1 : 0,
        downCount: status === "down" ? 1 : 0,
        downtimeFrequency: isTransitionToDown ? 1 : 0,
      },
    };

    const codeKey = statusCode
      ? `statusCodes.${statusCode}`
      : "statusCodes.unknown";
    updateObj.$inc[codeKey] = 1;

    if (responseTime !== null && responseTime !== undefined) {
      updateObj.$inc.responseTimeSum = responseTime;
      updateObj.$inc.responseTimeCount = 1;
    }

    await MonitorStats.findOneAndUpdate(
      { monitorId, date: today },
      updateObj,
      { upsert: true, new: true },
    );
  } catch (err) {
    console.error("Failed to update daily stats:", err);
  }
};

export const runEmailRetrySweep = async () => {
  try {
    const failedEmails = await EmailLog.find({
      status: "failed",
      retryStatus: "pending",
      retryCount: { $lt: 3 },
    });

    const resend = new Resend(RESEND_API_KEY);

    for (const emailLog of failedEmails) {
      emailLog.retryCount += 1;
      emailLog.retryStatus = "retrying";
      await emailLog.save();

      try {
        const user = await User.findById(emailLog.userId);
        const monitor = emailLog.monitorId
          ? await Monitor.findById(emailLog.monitorId)
          : null;

        if (user && monitor) {
          const formateDate = new Date().toLocaleString("en-US", {
            timeZone: monitor.timezone,
            dateStyle: "medium",
            timeStyle: "medium",
          });

          await resend.emails.send({
            from: `Ping Monitor <${SENDER_EMAIL}>`,
            to: emailLog.email,
            subject: emailLog.subject,
            html: getAlertTemplate({
              monitorName: monitor.name,
              url: monitor.url,
              statusCode: monitor.status === "down" ? 500 : 200,
              responseTime: 0,
              formateDate,
            }),
          });

          emailLog.status = "sent";
          emailLog.retryStatus = "retried";
        } else {
          emailLog.retryStatus = "failed";
        }
      } catch (err) {
        emailLog.retryStatus = emailLog.retryCount >= 3 ? "failed" : "pending";
        emailLog.errorReason = err.message;
      }
      await emailLog.save();
    }
  } catch (error) {
    console.error("Failed email retry check:", error.message);
  }
};
