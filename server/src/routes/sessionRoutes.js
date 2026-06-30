import express from "express";
import {
  getSessions,
  revokeSession,
  revokeOtherSessions,
  revokeCurrentSession,
} from "../controllers/sessionController.js";
import protect from "../middlewares/authMid.js";
import { csrfProtect } from "../middlewares/csrfMid.js";

const router = express.Router();

router.get("/", protect, csrfProtect, getSessions);
router.delete("/others", protect, csrfProtect, revokeOtherSessions);
router.delete("/current", protect, csrfProtect, revokeCurrentSession);
router.delete("/:id", protect, csrfProtect, revokeSession);

export default router;
