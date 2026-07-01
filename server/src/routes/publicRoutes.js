import express from "express";
import {
  getPublicStatus,
  getMonitorBadge,
  getUserBadge,
  pingHeartbeat,
  authStatusPage,
} from "../controllers/publicController.js";
import { heartbeatRateLimiter } from "../middlewares/heartbeatRateLimiter.js";

const router = express.Router();

router.get("/status/:slugOrUserId", getPublicStatus);
router.post("/status/auth/:slugOrUserId", authStatusPage);
router.get("/badge/:monitorId", getMonitorBadge);
router.get("/badge-user/:slugOrUserId", getUserBadge);

router.all("/heartbeat/ping/:token", heartbeatRateLimiter, pingHeartbeat);

export default router;
