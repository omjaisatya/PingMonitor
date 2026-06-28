import express from "express";
import {
  updateName,
  updateEmail,
  deactivateAccount,
  deleteAccount,
  updateThemePreference,
  updateStatusPageSettings,
  uploadAvatar,
  deleteAvatar,
  updateEmailReportSettings,
  sendTestEmailReport,
  exportAllUserData,
} from "../controllers/profileController.js";
import protect from "../middlewares/authMid.js";
import { csrfProtect } from "../middlewares/csrfMid.js";
import uploadMiddleware from "../middlewares/uploadMid.js";

const router = express.Router();

router.patch("/name", protect, csrfProtect, updateName);
router.patch("/theme", protect, csrfProtect, updateThemePreference);
router.patch("/email", protect, csrfProtect, updateEmail);
router.patch("/deactivate", protect, csrfProtect, deactivateAccount);
router.delete("/delete", protect, csrfProtect, deleteAccount);
router.patch("/status-page", protect, csrfProtect, updateStatusPageSettings);

router.patch("/email-reports", protect, csrfProtect, updateEmailReportSettings);
router.post("/email-reports/test", protect, csrfProtect, sendTestEmailReport);

router.post("/avatar", protect, csrfProtect, uploadMiddleware, uploadAvatar);
router.delete("/avatar", protect, csrfProtect, deleteAvatar);

router.get("/export", protect, csrfProtect, exportAllUserData);

export default router;
