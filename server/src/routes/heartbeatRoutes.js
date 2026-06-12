import express from "express";
import {
  createHeartbeat,
  getHeartbeats,
  getHeartbeatById,
  updateHeartbeat,
  pauseToggleHeartbeat,
  deleteHeartbeat,
} from "../controllers/heartbeatController.js";
import protect from "../middlewares/authMid.js";
import { csrfProtect } from "../middlewares/csrfMid.js";

const router = express.Router();

router.get("/", protect, getHeartbeats);
router.post("/", protect, csrfProtect, createHeartbeat);
router.get("/:id", protect, getHeartbeatById);
router.put("/:id", protect, csrfProtect, updateHeartbeat);
router.delete("/:id", protect, csrfProtect, deleteHeartbeat);
router.post("/:id/pause", protect, csrfProtect, pauseToggleHeartbeat);

export default router;
