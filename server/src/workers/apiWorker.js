import mongoose from "mongoose";
import connectDb from "../config/db.js";
import ApiMonitor from "../models/ApiMonitor.js";
import ApiRun from "../models/ApiRun.js";
import { runApiCheck } from "../services/apiExecutionService.js";
import { dispatchApiNotifications } from "../services/apiNotificationService.js";
import { createQueueWorker, queueNames } from "../services/queueService.js";

export const processApiCheck = async (monitorId) => {
  const monitor = await ApiMonitor.findById(monitorId);
  if (!monitor) {
    console.error(`ApiMonitor with ID ${monitorId} not found`);
    return null;
  }

  const result = await runApiCheck(monitorId);

  const previousStatus = monitor.status;
  const currentStatus = result.status === "success" ? "up" : "down";

  monitor.status = currentStatus;
  monitor.lastRunAt = new Date();

  if (currentStatus === "down") {
    monitor.consecutiveFailures += 1;
  } else {
    monitor.consecutiveFailures = 0;
  }

  await monitor.save();

  const runLog = await ApiRun.create({
    apiMonitorId: monitor._id,
    status: result.status,
    request: result.request,
    response: result.response,
    assertionResults: result.assertionResults,
    startTime: result.startTime,
    endTime: result.endTime,
    duration: result.duration,
    error: result.error,
  });

  if (currentStatus === "down" && previousStatus !== "down") {
    const message = `API monitor "${monitor.name}" assertions check failed. Status: DOWN.`;
    await dispatchApiNotifications(monitor, "down", message, result.error);
  } else if (currentStatus === "up" && previousStatus === "down") {
    const message = `API monitor "${monitor.name}" assertions check passed. Status: RECOVERED.`;
    await dispatchApiNotifications(monitor, "recovered", message);
  }

  return runLog;
};

const initializeWorker = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDb();
  }

  createQueueWorker(
    queueNames.api,
    async (job) => {
      const { monitorId } = job.data;
      console.log(`Processing enqueued API check for monitor ID: ${monitorId}`);
      try {
        const runLog = await processApiCheck(monitorId);
        return { success: true, runId: runLog?._id };
      } catch (err) {
        console.error(
          `Worker failed to execute API check job ${job.id}:`,
          err.message,
        );
        throw err;
      }
    },
    {
      concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
    },
  );

  console.log("API checks queue worker successfully initialized");
};

if (process.env.NODE_ENV !== "test") {
  initializeWorker().catch((err) => {
    console.error("Failed to start API checks worker:", err.message);
  });
}
