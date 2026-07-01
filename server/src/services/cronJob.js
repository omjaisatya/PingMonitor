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
import Heartbeat from "../models/Heartbeat.js";
import HeartbeatLog from "../models/HeartbeatLog.js";
import Session from "../models/Session.js";
import { dispatchHeartbeatNotifications } from "./heartbeatNotificationService.js";
import { getMonitorRegions } from "../config/regions.js";
import {
  createCheckGroupId,
  storeRegionalResult,
  aggregateRegionalCheck,
} from "./regionalAggregationService.js";
import sendAlert, { getAlertTemplate } from "./emailService.js";
import { Resend } from "resend";
import { RESEND_API_KEY, SENDER_EMAIL } from "../config/env.config.js";
import {
  handleMonitorFailureIncident,
  handleMonitorRecoveryIncident,
} from "./incidentService.js";
import fs from "fs";
import path from "path";
import { isRedisQueueEnabled, getQueues } from "./queueService.js";
import SyntheticMonitor from "../models/SyntheticMonitor.js";
import SyntheticRun from "../models/SyntheticRun.js";
import { processSyntheticCheck } from "../workers/syntheticWorker.js";
import ApiMonitor from "../models/ApiMonitor.js";
import { processApiCheck } from "../workers/apiWorker.js";
import { IS_DEMO_MODE } from "../config/env.config.js";
import { seedDemoData } from "../scripts/seedDemoData.js";
import {
  isMaintenanceActive,
  evaluateMaintenanceWindows,
} from "./maintenanceService.js";
import { generateReportData } from "./reportService.js";
import { sendScheduledReportEmail } from "./emailService.js";
import { dispatchDigestEmails } from "./subscriberNotificationService.js";

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
const dispatchNotifications = async (
  monitor,
  eventType,
  statusCode,
  responseTime,
  message,
  downtimeSec = 0,
) => {
  try {
    const isMaintenance = await isMaintenanceActive(monitor._id, "monitor");
    if (isMaintenance) {
      console.log(
        `Alert suppressed for ${monitor.name} due to active maintenance window.`,
      );
      return;
    }

    // 1. Check deduplication / cool-down for DOWN or SLOW events
    if (eventType === "down" || eventType === "slow") {
      if (monitor.lastAlertedAt && monitor.alertCooldown) {
        const elapsedMin =
          (Date.now() - new Date(monitor.lastAlertedAt).getTime()) /
          (1000 * 60);
        if (elapsedMin < monitor.alertCooldown) {
          console.log(
            `Deduplication: Skiping alert dispatch for ${monitor.name}. Cooldown active (${Math.round(elapsedMin)}/${monitor.alertCooldown}m).`,
          );
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
      console.log(
        `Muting alerts for ${monitor.name} due to active Quiet Hours DND.`,
      );
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
          { timeout: 3000 },
        );
        delivery.webhook = "sent";
      } catch (err) {
        console.error(
          `Webhook trigger failed for ${monitor.name}:`,
          err.message,
        );
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
        console.error(
          `In-App Log creation failed for ${monitor.name}:`,
          err.message,
        );
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
        console.error(
          `Email dispatch failed for ${monitor.name}:`,
          err.message,
        );
        delivery.email = "failed";
        errorDetails.email = err.message;
      }
    }

    // 7. Update cooldown timestamp for alerts
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
        { upsert: true },
      );
      return downtimeSec;
    }
  } catch (err) {
    console.error("Downtime duration calculation failed:", err);
  }
  return 0;
};

// Helper to update daily statistics incrementally
const updateDailyStats = async (
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

    await MonitorStats.findOneAndUpdate({ monitorId, date: today }, updateObj, {
      upsert: true,
      returnDocument: "after",
    });
  } catch (err) {
    console.error("Failed to update daily stats:", err);
  }
};

const pingmonitor = async (monitor) => {
  const start = Date.now();
  let status = "down";
  let statusCode = null;
  let responseTime = null;
  let errorMsg = "";

  try {
    const response = await axios.get(monitor.url, {
      timeout: 1000,
      httpAgent,
      httpsAgent,
    });
    responseTime = Date.now() - start;
    statusCode = response.status;
    status = response.status < 400 ? "up" : "down";
  } catch (error) {
    responseTime = Date.now() - start;
    statusCode = error.response ? error.response.status : null;
    errorMsg = error.message;
  }

  const checkGroupId = createCheckGroupId(monitor._id);
  const regions = getMonitorRegions();

  const offsets = {
    us: 120,
    europe: 180,
    asia: 30,
    australia: 90,
  };

  await Promise.all(
    regions.map((region) => {
      const offset = offsets[region] || 0;
      const simulatedResponseTime =
        status === "up"
          ? Math.max(
              10,
              Math.round(responseTime + offset + (Math.random() * 20 - 10)),
            )
          : null;

      return storeRegionalResult({
        checkGroupId,
        monitorId: monitor._id,
        status,
        statusCode,
        responseTime: simulatedResponseTime,
        error: errorMsg,
        region,
        checkedAt: new Date(),
      });
    }),
  );

  await aggregateRegionalCheck(checkGroupId);
};

const startEmailRetryCron = () => {
  cron.schedule("*/5 * * * *", async () => {
    console.log("cron is running email retry checks...");
    try {
      const failedEmails = await EmailLog.find({
        status: "failed",
        retryStatus: "pending",
        retryCount: { $lt: 3 },
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
          const monitor = emailLog.monitorId
            ? await Monitor.findById(emailLog.monitorId)
            : null;

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
            console.log(
              `Successfully retried alert email for ${monitor.name} to ${emailLog.email}`,
            );
          } else {
            emailLog.retryStatus = "failed";
            console.log(
              `Retry failed for email log ${emailLog._id}: User or Monitor no longer exists.`,
            );
          }
        } catch (err) {
          console.error(
            `Retry attempt ${emailLog.retryCount} failed for log ${emailLog._id}:`,
            err.message,
          );
          emailLog.retryStatus =
            emailLog.retryCount >= 3 ? "failed" : "pending";
          emailLog.errorReason = err.message;
        }
        await emailLog.save();
      }
    } catch (error) {
      console.error("Failed email retry check:", error.message);
    }
  });
};

const getHeartbeatIntervalMinutes = (interval) => {
  switch (interval) {
    case "1min":
      return 1;
    case "5min":
      return 5;
    case "15min":
      return 15;
    case "hourly":
      return 60;
    case "daily":
      return 1440;
    default:
      return 5;
  }
};

const evaluateHeartbeats = async () => {
  console.log("cron: evaluating active heartbeats...");
  try {
    const activeHeartbeats = await Heartbeat.find({ isActive: true });
    const now = new Date();

    for (const heartbeat of activeHeartbeats) {
      let isTimeout = false;
      const gracePeriodMs = (heartbeat.gracePeriod || 2) * 60 * 1000;

      if (heartbeat.nextExpectedPingAt) {
        const expectedTime = new Date(heartbeat.nextExpectedPingAt).getTime();
        if (now.getTime() > expectedTime + gracePeriodMs) {
          isTimeout = true;
        }
      } else {
        const createdTime = new Date(heartbeat.createdAt).getTime();
        const intervalMs =
          getHeartbeatIntervalMinutes(heartbeat.interval) * 60 * 1000;
        if (now.getTime() > createdTime + intervalMs + gracePeriodMs) {
          isTimeout = true;
        }
      }

      if (isTimeout) {
        const prevStatus = heartbeat.status;
        heartbeat.status = "down";
        heartbeat.consecutiveMissed += 1;
        heartbeat.pingCount += 1;
        heartbeat.downCount += 1;

        const intervalMinutes = getHeartbeatIntervalMinutes(heartbeat.interval);
        heartbeat.nextExpectedPingAt = new Date(
          now.getTime() + intervalMinutes * 60 * 1000,
        );

        await heartbeat.save();

        await HeartbeatLog.create({
          heartbeatId: heartbeat._id,
          status: "down",
          timestamp: now,
        });

        if (prevStatus !== "down") {
          const message = `Heartbeat monitor ${heartbeat.name} missed expected ping check-in. Status: DOWN.`;
          await dispatchHeartbeatNotifications(heartbeat, "down", message);
        } else {
          const message = `Heartbeat monitor ${heartbeat.name} remains DOWN.`;
          await dispatchHeartbeatNotifications(heartbeat, "down", message);
        }
      }
    }
  } catch (error) {
    console.error("cron: heartbeat evaluation failed:", error.message);
  }
};

const evaluateSyntheticMonitors = async () => {
  console.log("cron: evaluating active synthetic monitors...");
  try {
    const activeSynthetics = await SyntheticMonitor.find({ isActive: true });
    const now = Date.now();

    for (const monitor of activeSynthetics) {
      let shouldRun = false;
      if (!monitor.lastRunAt) {
        shouldRun = true;
      } else {
        const elapsedMs = now - new Date(monitor.lastRunAt).getTime();
        const intervalMs = monitor.interval * 60 * 1000;
        if (elapsedMs >= intervalMs) {
          shouldRun = true;
        }
      }

      if (shouldRun) {
        if (isRedisQueueEnabled()) {
          const queues = getQueues();
          await queues.synthetic.add(
            `synthetic:${monitor._id}`,
            { monitorId: monitor._id },
            {
              removeOnComplete: 100,
              removeOnFail: 200,
            },
          );
          console.log(`cron: enqueued synthetic check for ${monitor.name}`);
        } else {
          console.log(
            `cron: running inline synthetic check for ${monitor.name}`,
          );
          processSyntheticCheck(monitor._id).catch((err) => {
            console.error(
              `cron: inline synthetic execution failed for ${monitor.name}:`,
              err.message,
            );
          });
        }
      }
    }
  } catch (error) {
    console.error("cron: synthetic monitors evaluation failed:", error.message);
  }
};

const runDailyCleanup = async () => {
  console.log("cron: running daily logs and media cleanup...");
  try {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const expiredRuns = await SyntheticRun.find({
      createdAt: { $lt: cutoffDate },
    });

    let deletedCount = 0;
    for (const run of expiredRuns) {
      if (run.screenshotUrl) {
        const filePath = path.join(process.cwd(), run.screenshotUrl);
        if (fs.existsSync(filePath)) {
          await fs.promises
            .unlink(filePath)
            .catch((err) =>
              console.warn(
                `Failed to delete screenshot: ${filePath}`,
                err.message,
              ),
            );
        }
      }
      if (run.videoUrl) {
        const filePath = path.join(process.cwd(), run.videoUrl);
        if (fs.existsSync(filePath)) {
          await fs.promises
            .unlink(filePath)
            .catch((err) =>
              console.warn(`Failed to delete video: ${filePath}`, err.message),
            );
        }
      }
      deletedCount++;
    }
    console.log(
      `cron: cleanup completed. Deleted media files for ${deletedCount} expired runs.`,
    );
  } catch (error) {
    console.error("cron: daily cleanup failed:", error.message);
  }
};

const evaluateApiMonitors = async () => {
  console.log("cron: evaluating active API monitors...");
  try {
    const activeApis = await ApiMonitor.find({ isActive: true });
    const now = Date.now();

    for (const monitor of activeApis) {
      let shouldRun = false;
      if (!monitor.lastRunAt) {
        shouldRun = true;
      } else {
        const elapsedMs = now - new Date(monitor.lastRunAt).getTime();
        const intervalMs = monitor.interval * 60 * 1000;
        if (elapsedMs >= intervalMs) {
          shouldRun = true;
        }
      }

      if (shouldRun) {
        if (isRedisQueueEnabled()) {
          const queues = getQueues();
          await queues.api.add(
            `api:${monitor._id}`,
            { monitorId: monitor._id },
            {
              removeOnComplete: 100,
              removeOnFail: 200,
            },
          );
          console.log(`cron: enqueued API check for ${monitor.name}`);
        } else {
          console.log(`cron: running inline API check for ${monitor.name}`);
          processApiCheck(monitor._id).catch((err) => {
            console.error(
              `cron: inline API execution failed for ${monitor.name}:`,
              err.message,
            );
          });
        }
      }
    }
  } catch (error) {
    console.error("cron: API monitors evaluation failed:", error.message);
  }
};

const evaluateScheduledReports = async () => {
  console.log("cron: evaluating scheduled email reports...");
  try {
    const users = await User.find({ "emailReportConfig.enabled": true });

    for (const user of users) {
      const config = user.emailReportConfig;

      const now = new Date();
      const localTimeStr = now.toLocaleTimeString("en-US", {
        timeZone: config.timezone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      const currentHour = localTimeStr.split(":")[0];
      const deliveryHour = config.deliveryTime.split(":")[0];

      if (currentHour === deliveryHour) {
        let shouldSend = false;

        if (!config.lastReportSentAt) {
          shouldSend = true;
        } else {
          const lastSent = new Date(config.lastReportSentAt);
          const elapsedHours = (now - lastSent) / (1000 * 60 * 60);

          if (config.frequency === "daily" && elapsedHours >= 23) {
            shouldSend = true;
          } else if (config.frequency === "weekly" && elapsedHours >= 24 * 6) {
            shouldSend = true;
          } else if (
            config.frequency === "monthly" &&
            elapsedHours >= 24 * 28
          ) {
            shouldSend = true;
          }
        }

        if (shouldSend) {
          try {
            const reportData = await generateReportData(
              user._id,
              config.sections,
              config.frequency,
            );

            await sendScheduledReportEmail({
              email: user.email,
              name: user.name,
              frequency: config.frequency,
              reportData,
            });

            user.emailReportConfig.lastReportSentAt = new Date();
            await user.save();
            console.log(`Scheduled report sent to ${user.email}`);
          } catch (err) {
            console.error(
              `Failed to send scheduled report to ${user.email}:`,
              err.message,
            );
          }
        }
      }
    }
  } catch (error) {
    console.error(
      "cron: scheduled email reports evaluation failed:",
      error.message,
    );
  }
};

const startCron = () => {
  cron.schedule("* * * * *", async () => {
    console.log("cron is started - checking monitor");

    try {
      const monitors = await Monitor.find({ isActive: true }); //only resume

      const monitorPings = monitors.map((monitor) => pingmonitor(monitor));

      await Promise.allSettled([
        evaluateMaintenanceWindows(),
        ...monitorPings,
        evaluateHeartbeats(),
        evaluateSyntheticMonitors(),
        evaluateApiMonitors(),
      ]);
    } catch (error) {
      console.log("cron error", error.message);
    }
  });

  // Start failed emails retry cron
  startEmailRetryCron();

  cron.schedule("0 0 * * *", async () => {
    await runDailyCleanup();
    if (IS_DEMO_MODE) {
      console.log("cron: running daily demo data reset...");
      await seedDemoData();
    }
  });

  cron.schedule("0 * * * *", async () => {
    await evaluateScheduledReports();
    try {
      await dispatchDigestEmails();
    } catch (err) {
      console.error("cron: subscriber digests failed:", err.message);
    }
    try {
      const expiredResult = await Session.updateMany(
        { status: "active", expiresAt: { $lt: new Date() } },
        { status: "expired" }
      );
      if (expiredResult.modifiedCount > 0) {
        console.log(`cron: Expired ${expiredResult.modifiedCount} inactive sessions.`);
      }
    } catch (error) {
      console.error("cron: session expiration check failed:", error.message);
    }
  });
};

export default startCron;
