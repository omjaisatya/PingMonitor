import cron from "node-cron";
import Monitor from "../models/Monitor.js";
import { getMonitorRegions } from "../config/regions.js";
import {
  createQueueWorker,
  getQueues,
  getWorkerTokenHash,
  isRedisQueueEnabled,
  queueNames,
} from "./queueService.js";
import {
  aggregateRegionalCheck,
  createCheckGroupId,
  storeRegionalResult,
} from "./regionalAggregationService.js";

const AGGREGATION_DELAY_MS = 15000;

export const enqueueRegionalChecks = async (monitor) => {
  const queues = getQueues();
  const regions = getMonitorRegions();
  const checkGroupId = createCheckGroupId(monitor._id);
  const workerTokenHash = getWorkerTokenHash();

  await Promise.all(
    regions.map((region) =>
      queues.checksForRegion(region).add(
        `check:${region}:${monitor._id}:${Date.now()}`,
        {
          checkGroupId,
          monitorId: monitor._id.toString(),
          url: monitor.url,
          timeout: 1000,
          region,
          workerTokenHash,
        },
        {
          attempts: 2,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: 2000,
          removeOnFail: 5000,
        },
      ),
    ),
  );

  await queues.aggregate.add(
    `aggregate:${checkGroupId}`,
    { checkGroupId },
    {
      delay: AGGREGATION_DELAY_MS,
      attempts: 2,
      removeOnComplete: 2000,
      removeOnFail: 5000,
    },
  );

  return checkGroupId;
};

export const startDistributedScheduler = () => {
  if (!isRedisQueueEnabled()) {
    console.warn("Distributed monitoring disabled: REDIS_URL is not configured");
    return false;
  }

  cron.schedule("* * * * *", async () => {
    try {
      const monitors = await Monitor.find({ isActive: true });
      await Promise.allSettled(
        monitors.map((monitor) => enqueueRegionalChecks(monitor)),
      );
    } catch (error) {
      console.error("Distributed scheduler failed:", error.message);
    }
  });

  return true;
};

export const startAggregationWorkers = () => {
  if (!isRedisQueueEnabled()) return [];

  const resultWorker = createQueueWorker(queueNames.results, async (job) => {
    if (job.data.workerTokenHash !== getWorkerTokenHash()) {
      throw new Error("Regional result authentication failed");
    }
    await storeRegionalResult(job.data);
  });

  const aggregateWorker = createQueueWorker(
    queueNames.aggregate,
    async (job) => {
      await aggregateRegionalCheck(job.data.checkGroupId);
    },
    { concurrency: 10 },
  );

  return [resultWorker, aggregateWorker];
};
