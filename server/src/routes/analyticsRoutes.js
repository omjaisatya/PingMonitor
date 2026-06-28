import express from "express";
import protect from "../middlewares/authMid.js";
import {
  getOverview,
  getMonitorAnalytics,
  getAlertsHistory,
  getEmailsHistory,
  exportAlertsHistory,
  exportEmailsHistory,
  exportMonitorTrends,
  exportPDFReport,
} from "../controllers/analyticsController.js";

const router = express.Router();

router.use(protect);

router.get("/overview", getOverview);
router.get("/monitors/:id", getMonitorAnalytics);
router.get("/alerts", getAlertsHistory);
router.get("/emails", getEmailsHistory);

router.get("/export/alerts", exportAlertsHistory);
router.get("/export/emails", exportEmailsHistory);
router.get("/export/trends/:id", exportMonitorTrends);
router.get("/export/pdf", exportPDFReport);

export default router;
