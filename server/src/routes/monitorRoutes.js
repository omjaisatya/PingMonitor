import express from "express";
import protect from "../middlewares/authMid.js";

import {
  getMonitorById,
  getMonitors,
  updateMonitor,
  createMonitor,
  deleteMonitor,
  pauseToggleMonitor,
} from "../controllers/monitorController.js";

import {
  createMonitorValidate,
  updateMonitorValidate,
  validateMonitorID,
} from "../validators/monitorVal.js";
import validate from "../validators/validate.js";

const router = express.Router();

router.use(protect);

router.get("/", getMonitors);
router.post("/", createMonitorValidate, validate, createMonitor);
router.get("/:id", validateMonitorID, validate, getMonitorById);
router.put("/:id", updateMonitorValidate, validate, updateMonitor);
router.patch("/:id/toggle", validateMonitorID, validate, pauseToggleMonitor);
router.delete("/:id", validateMonitorID, validate, deleteMonitor);

export default router;
