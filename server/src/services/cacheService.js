import IORedis from "ioredis";
import { REDIS_URL } from "../config/env.config.js";

let redisClient = null;

if (REDIS_URL) {
  try {
    redisClient = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
    });
    redisClient.on("error", (err) => {
      console.warn("[Cache Service] Redis Connection Error:", err.message);
    });
    console.log("[Cache Service] Connected to Redis successfully.");
  } catch (err) {
    console.warn("[Cache Service] Failed to initialize Redis client:", err.message);
  }
} else {
  console.log("[Cache Service] Redis not configured. Using in-memory fallback cache.");
}

const memoryCache = new Map();

export const getCache = async (key) => {
  if (redisClient) {
    try {
      const val = await redisClient.get(key);
      if (val) {
        return JSON.parse(val);
      }
    } catch (err) {
      console.warn(`[Cache Service] Redis GET error for key ${key}, falling back to memory:`, err.message);
    }
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiry) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
};

export const setCache = async (key, value, ttlSeconds = 60) => {
  if (redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    } catch (err) {
      console.warn(`[Cache Service] Redis SET error for key ${key}, falling back to memory:`, err.message);
    }
  }

  memoryCache.set(key, {
    value,
    expiry: Date.now() + ttlSeconds * 1000,
  });
};

export const deleteCache = async (key) => {
  if (redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      console.warn(`[Cache Service] Redis DEL error for key ${key}, falling back to memory:`, err.message);
    }
  }

  memoryCache.delete(key);
};
