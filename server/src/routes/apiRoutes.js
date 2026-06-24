import express from "express";
import {
  createApiCollection,
  getApiCollections,
  updateApiCollection,
  deleteApiCollection,
  createApiMonitor,
  getApiMonitors,
  getApiMonitorById,
  updateApiMonitor,
  pauseToggleApiMonitor,
  deleteApiMonitor,
  runApiMonitorNow,
  getApiRunDetail,
} from "../controllers/apiController.js";
import protect from "../middlewares/authMid.js";
import { csrfProtect } from "../middlewares/csrfMid.js";

const router = express.Router();

router.get("/collections", protect, getApiCollections);
router.post("/collections", protect, csrfProtect, createApiCollection);
router.put(
  "/collections/:collectionId",
  protect,
  csrfProtect,
  updateApiCollection,
);
router.delete(
  "/collections/:collectionId",
  protect,
  csrfProtect,
  deleteApiCollection,
);

router.get("/", protect, getApiMonitors);
router.post("/", protect, csrfProtect, createApiMonitor);
router.get("/:id", protect, getApiMonitorById);
router.put("/:id", protect, csrfProtect, updateApiMonitor);
router.delete("/:id", protect, csrfProtect, deleteApiMonitor);
router.post("/:id/pause", protect, csrfProtect, pauseToggleApiMonitor);
router.post("/:id/run", protect, csrfProtect, runApiMonitorNow);
router.get("/runs/:runId", protect, getApiRunDetail);

export default router;
