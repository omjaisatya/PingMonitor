import express from "express";
import {
  getPublicStatus,
  getMonitorBadge,
  getUserBadge,
  pingHeartbeat,
} from "../controllers/publicController.js";
import { heartbeatRateLimiter } from "../middlewares/heartbeatRateLimiter.js";

const router = express.Router();

router.get("/status/:slugOrUserId", getPublicStatus);
router.get("/badge/:monitorId", getMonitorBadge);
router.get("/badge-user/:slugOrUserId", getUserBadge);

router.all("/heartbeat/ping/:token", heartbeatRateLimiter, pingHeartbeat);

export default router;
