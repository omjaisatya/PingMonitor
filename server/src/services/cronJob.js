import cron from "node-cron";
import axios from "axios";
import http from "http";
import https from "https";
import Monitor from "../models/Monitor.js";
import Log from "../models/Log.js";
import User from "../models/User.js";
import MonitorStats from "../models/MonitorStats.js";
import AlertLog from "../models/AlertLog.js";
import EmailLog from "../models/EmailLog.js";
import InAppNotification from "../models/InAppNotification.js";
import sendAlert, { getAlertTemplate } from "./emailService.js";
import { Resend } from "resend";
import { RESEND_API_KEY, SENDER_EMAIL } from "../config/env.config.js";
import {
  handleMonitorFailureIncident,
  handleMonitorRecoveryIncident,
} from "./incidentService.js";

// Keep-Alive connection pooling agents
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// Quiet hours check helper
const isInQuietHours = (quietHours, timezone = "UTC") => {
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

    if (start < end) {
      return timeString >= start && timeString <= end;
    } else {
      return timeString >= start || timeString <= end;
    }
  } catch (err) {
    console.error("Quiet hours evaluation failed:", err);
    return false;
  }
};

// Dispatch alerts to configured channels
const dispatchNotifications = async (monitor, eventType, statusCode, responseTime, message, downtimeSec = 0) => {
  try {
    // 1. Check deduplication / cool-down for DOWN or SLOW events
    if (eventType === "down" || eventType === "slow") {
      if (monitor.lastAlertedAt && monitor.alertCooldown) {
        const elapsedMin = (Date.now() - new Date(monitor.lastAlertedAt).getTime()) / (1000 * 60);
        if (elapsedMin < monitor.alertCooldown) {
          console.log(`Deduplication: Skiping alert dispatch for ${monitor.name}. Cooldown active (${Math.round(elapsedMin)}/${monitor.alertCooldown}m).`);
          return;
        }
      }
    }

    // 2. Initialize delivery channels statuses
    const delivery = {
      email: monitor.alertChannels?.email ? "pending" : "disabled",
      webhook: monitor.alertChannels?.webhook ? "pending" : "disabled",
      inApp: monitor.alertChannels?.inApp ? "pending" : "disabled",
    };
    const errorDetails = { email: null, webhook: null };

    // 3. Evaluate Quiet Hours (Do Not Disturb)
    const dndActive = isInQuietHours(monitor.quietHours, monitor.timezone);
    if (dndActive) {
      if (delivery.email === "pending") delivery.email = "muted";
      if (delivery.webhook === "pending") delivery.webhook = "muted";
      if (delivery.inApp === "pending") delivery.inApp = "muted";
      console.log(`Muting alerts for ${monitor.name} due to active Quiet Hours DND.`);
    }

    // 4. Dispatch Webhook
    if (delivery.webhook === "pending" && monitor.webhookUrl) {
      try {
        await axios.post(
          monitor.webhookUrl,
          {
            event: `monitor.${eventType}`,
            monitor: {
              id: monitor._id,
              name: monitor.name,
              url: monitor.url,
            },
            incident: {
              status: eventType,
              statusCode,
              responseTime,
              message,
              downtimeSec,
              timestamp: new Date().toISOString(),
            },
          },
          { timeout: 3000 }
        );
        delivery.webhook = "sent";
      } catch (err) {
        console.error(`Webhook trigger failed for ${monitor.name}:`, err.message);
        delivery.webhook = "failed";
        errorDetails.webhook = err.message;
      }
    } else if (delivery.webhook === "pending") {
      delivery.webhook = "disabled";
    }

    // 5. Dispatch In-App Notifications
    if (delivery.inApp === "pending") {
      try {
        await InAppNotification.create({
          userId: monitor.userId,
          monitorId: monitor._id,
          status: eventType,
          message,
        });
        delivery.inApp = "sent";
      } catch (err) {
        console.error(`In-App Log creation failed for ${monitor.name}:`, err.message);
        delivery.inApp = "failed";
      }
    }

    // 6. Dispatch Email Notifications
    if (delivery.email === "pending") {
      try {
        const user = await User.findById(monitor.userId);
        if (user && user.isVerified !== false) {
          const recipients = [user.email, ...(monitor.escalationEmails || [])];
          const currentDate = new Date();
          const formateDate = currentDate.toLocaleString("en-US", {
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
          delivery.email = "disabled"; // User unverified
        }
      } catch (err) {
        console.error(`Email dispatch failed for ${monitor.name}:`, err.message);
        delivery.email = "failed";
        errorDetails.email = err.message;
      }
    }

    // 7. Update cooldown timestamp for alerts
    if (
      (delivery.email === "sent" || delivery.webhook === "sent" || delivery.inApp === "sent") &&
      eventType !== "recovered"
    ) {
      await Monitor.findByIdAndUpdate(monitor._id, { lastAlertedAt: new Date() });
    }

    // 8. Create Alert History & Audit Log
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
  } catch (err) {
    console.error("Failed to run dispatch process:", err.message);
  }
};

// Calculate downtime duration on recovery
const calculateDowntime = async (monitorId) => {
  try {
    const lastDownAlert = await AlertLog.findOne({
      monitorId,
      status: "down",
    }).sort({ timestamp: -1 });

    if (lastDownAlert) {
      const downtimeMs = Date.now() - lastDownAlert.timestamp.getTime();
      const downtimeSec = Math.round(downtimeMs / 1000);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await MonitorStats.findOneAndUpdate(
        { monitorId, date: today },
        { $inc: { downtimeDuration: downtimeSec } },
        { upsert: true }
      );
      return downtimeSec;
    }
  } catch (err) {
    console.error("Downtime duration calculation failed:", err);
  }
  return 0;
};

// Helper to update daily statistics incrementally
const updateDailyStats = async (monitorId, status, responseTime, statusCode, previousStatus) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const isTransitionToDown = (status === "down" && previousStatus !== "down");

    const updateObj = {
      $inc: {
        pingCount: 1,
        upCount: status === "up" ? 1 : 0,
        downCount: status === "down" ? 1 : 0,
        downtimeFrequency: isTransitionToDown ? 1 : 0,
      }
    };

    const codeKey = statusCode ? `statusCodes.${statusCode}` : "statusCodes.unknown";
    updateObj.$inc[codeKey] = 1;

    if (responseTime !== null && responseTime !== undefined) {
      updateObj.$inc.responseTimeSum = responseTime;
      updateObj.$inc.responseTimeCount = 1;
    }

    await MonitorStats.findOneAndUpdate(
      { monitorId, date: today },
      updateObj,
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("Failed to update daily stats:", err);
  }
};

const pingmonitor = async (monitor) => {
  const start = Date.now();
  let status = "down";
  let statusCode = null;
  let responseTime = null;

  try {
    const response = await axios.get(monitor.url, { 
      timeout: 1000,
      httpAgent,
      httpsAgent
    });
    responseTime = Date.now() - start;
    statusCode = response.status;
    status = response.status < 400 ? "up" : "down";
  } catch (error) {
    responseTime = Date.now() - start;
    statusCode = error.response ? error.response.status : null;
  }

  await Log.create({
    monitorId: monitor._id,
    status,
    statusCode,
    responseTime,
  });

  const previousStatus = monitor.status;

  if (status === "up") {
    // Reset consecutive failures
    await Monitor.findByIdAndUpdate(monitor._id, { consecutiveFailures: 0 });

    if (previousStatus === "down") {
      // 1. Calculate Downtime
      const downtimeSec = await calculateDowntime(monitor._id);
      
      // 2. Handle Recovery Notification Preferences
      const notifyOnRecovery = monitor.notifyOnRecovery ?? true;
      const recoveryDelay = monitor.recoveryAlertDelay ?? 0;

      if (notifyOnRecovery) {
        if (recoveryDelay === 0) {
          // Send immediately
          const message = `Monitor ${monitor.name} is back UP (HTTP ${statusCode})`;
          await dispatchNotifications(monitor, "recovered", statusCode, responseTime, message, downtimeSec);
          await handleMonitorRecoveryIncident({ monitor, statusCode, responseTime, downtimeSec });
          await Monitor.findByIdAndUpdate(monitor._id, { status: "up", firstRecoveredAt: null });
        } else {
          // Delay notification - set recovery timestamp
          await Monitor.findByIdAndUpdate(monitor._id, { status: "up", firstRecoveredAt: new Date() });
          console.log(`Delaying recovery alert for ${monitor.name} by ${recoveryDelay} minutes.`);
        }
      } else {
        // Recovery alerts disabled
        await Monitor.findByIdAndUpdate(monitor._id, { status: "up", firstRecoveredAt: null });
        console.log(`Recovery alert muted for ${monitor.name} per preferences.`);
      }
    } else {
      // previousStatus was "up"
      // Check if we have a pending delayed recovery notification
      if (monitor.firstRecoveredAt) {
        const elapsedMs = Date.now() - new Date(monitor.firstRecoveredAt).getTime();
        const delayMs = (monitor.recoveryAlertDelay || 0) * 60 * 1000;

        if (elapsedMs >= delayMs) {
          const downtimeSec = await calculateDowntime(monitor._id);
          const message = `Monitor ${monitor.name} is back UP (HTTP ${statusCode})`;
          await dispatchNotifications(monitor, "recovered", statusCode, responseTime, message, downtimeSec);
          await handleMonitorRecoveryIncident({ monitor, statusCode, responseTime, downtimeSec });
          await Monitor.findByIdAndUpdate(monitor._id, { firstRecoveredAt: null });
          console.log(`Delayed recovery alert dispatched for ${monitor.name} after ${monitor.recoveryAlertDelay} minutes.`);
        }
      } else {
        // Latency threshold alert checking
        const latencyLimit = monitor.latencyThreshold || 2000;
        if (responseTime > latencyLimit) {
          const message = `Monitor ${monitor.name} is SLOW. Latency: ${responseTime}ms (threshold: ${latencyLimit}ms)`;
          await dispatchNotifications(monitor, "slow", statusCode, responseTime, message);
        }
      }
    }
  }

  if (status === "down") {
    const updatedFailures = (monitor.consecutiveFailures || 0) + 1;
    await Monitor.findByIdAndUpdate(monitor._id, { 
      consecutiveFailures: updatedFailures,
      firstRecoveredAt: null // reset recovery tracker on failure
    });

    const limit = monitor.retryLimit || 1;

    if (updatedFailures >= limit) {
      if (previousStatus !== "down") {
        // Trigger DOWN Alert
        const message = `Monitor ${monitor.name} is DOWN. HTTP ${statusCode || 'No Response'} (failed ${updatedFailures} consecutive times)`;
        await dispatchNotifications(monitor, "down", statusCode, responseTime, message);
      } else {
        // Still down, cooldown limits will be checked inside notification dispatcher
        const message = `Monitor ${monitor.name} remains DOWN. HTTP ${statusCode || 'No Response'}`;
        await dispatchNotifications(monitor, "down", statusCode, responseTime, message);
      }
      await handleMonitorFailureIncident({
        monitor,
        statusCode,
        responseTime,
        failureCount: updatedFailures,
      });
      await Monitor.findByIdAndUpdate(monitor._id, { status: "down", firstRecoveredAt: null });
    }
  }

  // Update daily stats incrementally in all cases
  await updateDailyStats(monitor._id, status, responseTime, statusCode, previousStatus);

  console.log(
    `[${new Date().toLocaleTimeString()}] ${monitor.name} → ${status.toUpperCase()} (${statusCode}) ${responseTime}ms`
  );
};

const startEmailRetryCron = () => {
  cron.schedule("*/5 * * * *", async () => {
    console.log("cron is running email retry checks...");
    try {
      const failedEmails = await EmailLog.find({
        status: "failed",
        retryStatus: "pending",
        retryCount: { $lt: 3 }
      });

      if (failedEmails.length === 0) {
        return;
      }

      console.log(`Found ${failedEmails.length} failed emails to retry.`);
      const resend = new Resend(RESEND_API_KEY);

      for (const emailLog of failedEmails) {
        emailLog.retryCount += 1;
        emailLog.retryStatus = "retrying";
        await emailLog.save();

        try {
          const user = await User.findById(emailLog.userId);
          const monitor = emailLog.monitorId ? await Monitor.findById(emailLog.monitorId) : null;

          if (user && monitor) {
            const currentDate = new Date();
            const formateDate = currentDate.toLocaleString("en-US", {
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
            console.log(`Successfully retried alert email for ${monitor.name} to ${emailLog.email}`);
          } else {
            emailLog.retryStatus = "failed";
            console.log(`Retry failed for email log ${emailLog._id}: User or Monitor no longer exists.`);
          }
        } catch (err) {
          console.error(`Retry attempt ${emailLog.retryCount} failed for log ${emailLog._id}:`, err.message);
          emailLog.retryStatus = emailLog.retryCount >= 3 ? "failed" : "pending";
          emailLog.errorReason = err.message;
        }
        await emailLog.save();
      }
    } catch (error) {
      console.error("Failed email retry check:", error.message);
    }
  });
};

const startCron = () => {
  cron.schedule("* * * * *", async () => {
    console.log("cron is started - checking monitor");

    try {
      const monitors = await Monitor.find({ isActive: true }); //only resume

      if (monitors.length === 0) {
        console.log("No monitor find");
        return;
      }

      await Promise.allSettled(monitors.map((monitor) => pingmonitor(monitor)));
    } catch (error) {
      console.log("cron error", error.message);
    }
  });

  // Start failed emails retry cron
  startEmailRetryCron();
};

export default startCron;
