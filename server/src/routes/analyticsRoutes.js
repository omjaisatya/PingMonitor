import express from "express";
import protect from "../middlewares/authMid.js";
import {
  getOverview,
  getMonitorAnalytics,
  getAlertsHistory,
  getEmailsHistory,
} from "../controllers/analyticsController.js";

const router = express.Router();

router.use(protect);

router.get("/overview", getOverview);
router.get("/monitors/:id", getMonitorAnalytics);
router.get("/alerts", getAlertsHistory);
router.get("/emails", getEmailsHistory);

export default router;
