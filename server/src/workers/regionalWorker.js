import crypto from "crypto";
import connectDb from "../config/db.js";
import {
  MONITOR_NODE_REGION,
  WORKER_NODE_TOKEN,
} from "../config/env.config.js";
import { DEFAULT_MONITOR_REGIONS } from "../config/regions.js";
import { runHttpCheck } from "../services/monitorExecutionService.js";
import {
  createQueueWorker,
  getQueues,
  getWorkerTokenHash,
  queueNames,
} from "../services/queueService.js";

const region = (MONITOR_NODE_REGION || "").toLowerCase();
const workerId = `${region || "unknown"}-${crypto.randomBytes(4).toString("hex")}`;

if (!DEFAULT_MONITOR_REGIONS.includes(region)) {
  throw new Error(
    `MONITOR_NODE_REGION must be one of: ${DEFAULT_MONITOR_REGIONS.join(", ")}`,
  );
}

if (!WORKER_NODE_TOKEN) {
  throw new Error("WORKER_NODE_TOKEN is required for regional workers");
}

await connectDb();

createQueueWorker(
  queueNames.checksForRegion(region),
  async (job) => {
    const expectedTokenHash = getWorkerTokenHash();
    if (job.data.workerTokenHash !== expectedTokenHash) {
      throw new Error("Worker authentication failed");
    }

    const result = await runHttpCheck(job.data.url, job.data.timeout);
    await getQueues().results.add(
      `result:${job.data.checkGroupId}:${region}`,
      {
        ...result,
        checkGroupId: job.data.checkGroupId,
        monitorId: job.data.monitorId,
        region,
        workerId,
        workerTokenHash: expectedTokenHash,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 2000,
        removeOnFail: 5000,
      },
    );

    return { region, status: result.status, responseTime: result.responseTime };
  },
  {
    concurrency: Number(process.env.WORKER_CONCURRENCY || 10),
  },
);

console.log(`Regional monitoring worker started for ${region} (${workerId})`);
