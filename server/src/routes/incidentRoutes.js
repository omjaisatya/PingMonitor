import express from "express";
import protect from "../middlewares/authMid.js";
import {
  addIncidentComment,
  createIncident,
  getAutomationRules,
  getIncidentById,
  getIncidents,
  sendIncidentEmailUpdate,
  updateAffectedServices,
  updateIncident,
  updateRootCauseAnalysis,
  upsertAutomationRule,
} from "../controllers/incidentController.js";

const router = express.Router();

router.use(protect);

router.get("/", getIncidents);
router.post("/", createIncident);
router.get("/automation-rules", getAutomationRules);
router.post("/automation-rules", upsertAutomationRule);
router.put("/automation-rules/:id", upsertAutomationRule);
router.get("/:id", getIncidentById);
router.patch("/:id", updateIncident);
router.post("/:id/comments", addIncidentComment);
router.patch("/:id/rca", updateRootCauseAnalysis);
router.patch("/:id/services", updateAffectedServices);
router.post("/:id/email-updates", sendIncidentEmailUpdate);

export default router;
