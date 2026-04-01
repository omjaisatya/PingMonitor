import express from "express";
import protect from "../middlewares/authMid.js";

import {
  getMonitorById,
  getMonitors,
  updateMonitor,
  createMonitor,
  deleteMonitor,
} from "../controllers/monitorController.js";

const router = express.Router();

router.use(protect);

router.get("/", getMonitors);
router.post("/", createMonitor);
router.get("/:id", getMonitorById);
router.put("/:id", updateMonitor);
router.delete("/:id", deleteMonitor);

export default router;
