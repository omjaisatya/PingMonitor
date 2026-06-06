import crypto from "crypto";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { REDIS_URL, WORKER_NODE_TOKEN } from "../config/env.config.js";

const CHECK_QUEUE_NAME = "monitor-checks";
const RESULT_QUEUE_NAME = "monitor-results";
const AGGREGATE_QUEUE_NAME = "monitor-aggregate";

let connection = null;
let queues = null;

export const isRedisQueueEnabled = () => Boolean(REDIS_URL);

export const getWorkerTokenHash = () => {
  if (!WORKER_NODE_TOKEN) return null;
  return crypto.createHash("sha256").update(WORKER_NODE_TOKEN).digest("hex");
};

export const getQueueConnection = () => {
  if (!REDIS_URL) {
    throw new Error("REDIS_URL is required for distributed monitoring queues");
  }

  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  return connection;
};

export const getQueues = () => {
  if (!queues) {
    const redis = getQueueConnection();
    queues = {
      checksForRegion: (region) =>
        new Queue(`${CHECK_QUEUE_NAME}-${region}`, { connection: redis }),
      results: new Queue(RESULT_QUEUE_NAME, { connection: redis }),
      aggregate: new Queue(AGGREGATE_QUEUE_NAME, { connection: redis }),
    };
  }

  return queues;
};

export const createQueueWorker = (queueName, processor, options = {}) =>
  new Worker(queueName, processor, {
    connection: getQueueConnection(),
    concurrency: options.concurrency || 5,
  });

export const queueNames = {
  checks: CHECK_QUEUE_NAME,
  checksForRegion: (region) => `${CHECK_QUEUE_NAME}-${region}`,
  results: RESULT_QUEUE_NAME,
  aggregate: AGGREGATE_QUEUE_NAME,
};
