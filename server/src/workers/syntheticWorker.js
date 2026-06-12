import mongoose from "mongoose";
import connectDb from "../config/db.js";
import SyntheticMonitor from "../models/SyntheticMonitor.js";
import SyntheticRun from "../models/SyntheticRun.js";
import { runSyntheticCheck } from "../services/syntheticExecutionService.js";
import { dispatchSyntheticNotifications } from "../services/syntheticNotificationService.js";
import { createQueueWorker, queueNames } from "../services/queueService.js";

export const processSyntheticCheck = async (monitorId) => {
  const monitor = await SyntheticMonitor.findById(monitorId);
  if (!monitor) {
    console.error(`SyntheticMonitor with ID ${monitorId} not found`);
    return null;
  }

  const result = await runSyntheticCheck(
    monitor.script,
    monitor.timeout || 30000,
  );

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

  const runLog = await SyntheticRun.create({
    syntheticMonitorId: monitor._id,
    status: result.status,
    error: result.error,
    startTime: result.startTime,
    endTime: result.endTime,
    duration: result.duration,
    metrics: result.metrics,
    consoleLogs: result.consoleLogs,
    failedRequests: result.failedRequests,
    screenshotUrl: result.screenshotUrl,
    videoUrl: result.videoUrl,
  });

  if (currentStatus === "down" && previousStatus !== "down") {
    const message = `Synthetic monitor "${monitor.name}" has FAILED.`;
    await dispatchSyntheticNotifications(
      monitor,
      "down",
      message,
      result.error,
    );
  } else if (currentStatus === "up" && previousStatus === "down") {
    const message = `Synthetic monitor "${monitor.name}" has RECOVERED and is now UP.`;
    await dispatchSyntheticNotifications(monitor, "recovered", message);
  }

  return runLog;
};

const initializeWorker = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDb();
  }

  createQueueWorker(
    queueNames.synthetic,
    async (job) => {
      const { monitorId } = job.data;
      console.log(
        `Processing enqueued synthetic check for monitor ID: ${monitorId}`,
      );
      try {
        const runLog = await processSyntheticCheck(monitorId);
        return { success: true, runId: runLog?._id };
      } catch (err) {
        console.error(
          `Worker failed to execute synthetic check job ${job.id}:`,
          err.message,
        );
        throw err;
      }
    },
    {
      concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
    },
  );

  console.log("Synthetic checks queue worker successfully initialized");
};

if (process.env.NODE_ENV !== "test") {
  initializeWorker().catch((err) => {
    console.error("Failed to start synthetic queue worker:", err.message);
  });
}
