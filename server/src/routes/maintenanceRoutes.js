import express from "express";
import {
  getMaintenanceWindows,
  createMaintenanceWindow,
  deleteMaintenanceWindow,
} from "../controllers/maintenanceController.js";
import protect from "../middlewares/authMid.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .get(getMaintenanceWindows)
  .post(createMaintenanceWindow);

router.route("/:id")
  .delete(deleteMaintenanceWindow);

export default router;
