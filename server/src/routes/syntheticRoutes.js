import express from "express";
import {
  createSyntheticMonitor,
  getSyntheticMonitors,
  getSyntheticMonitorById,
  updateSyntheticMonitor,
  pauseToggleSyntheticMonitor,
  deleteSyntheticMonitor,
  runSyntheticMonitorNow,
  getSyntheticRunDetail,
} from "../controllers/syntheticController.js";
import protect from "../middlewares/authMid.js";
import { csrfProtect } from "../middlewares/csrfMid.js";

const router = express.Router();

router.get("/", protect, getSyntheticMonitors);
router.post("/", protect, csrfProtect, createSyntheticMonitor);
router.get("/:id", protect, getSyntheticMonitorById);
router.put("/:id", protect, csrfProtect, updateSyntheticMonitor);
router.delete("/:id", protect, csrfProtect, deleteSyntheticMonitor);
router.post("/:id/pause", protect, csrfProtect, pauseToggleSyntheticMonitor);
router.post("/:id/run", protect, csrfProtect, runSyntheticMonitorNow);
router.get("/runs/:runId", protect, getSyntheticRunDetail);

export default router;
