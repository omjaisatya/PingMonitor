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

const requireVerifiedAccount = (req, res, next) => {
  if (req.user.isVerified === false && process.env.NODE_ENV !== "development") {
    return res.status(403).json({
      message:
        "Please verify your email before creating or changing monitors. Verification is required for alert delivery.",
      code: "ACCOUNT_NOT_VERIFIED",
    });
  }

  next();
};

router.use(protect);

router.get("/", getMonitors);
router.post("/", requireVerifiedAccount, createMonitorValidate, validate, createMonitor);
router.get("/:id", validateMonitorID, validate, getMonitorById);
router.put("/:id", requireVerifiedAccount, updateMonitorValidate, validate, updateMonitor);
router.patch("/:id/toggle", requireVerifiedAccount, validateMonitorID, validate, pauseToggleMonitor);
router.delete("/:id", validateMonitorID, validate, deleteMonitor);

export default router;
