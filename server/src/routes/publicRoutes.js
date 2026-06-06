import express from "express";
import {
  getPublicStatus,
  getMonitorBadge,
  getUserBadge,
} from "../controllers/publicController.js";

const router = express.Router();

router.get("/status/:slugOrUserId", getPublicStatus);
router.get("/badge/:monitorId", getMonitorBadge);
router.get("/badge-user/:slugOrUserId", getUserBadge);

export default router;
