import express from "express";
import {
  updateName,
  updateEmail,
  deactivateAccount,
  deleteAccount,
} from "../controllers/profileController.js";
import protect from "../middlewares/authMid.js";
import { csrfProtect } from "../middlewares/csrfMid.js";

const router = express.Router();

router.patch("/name", protect, csrfProtect, updateName);
router.patch("/email", protect, csrfProtect, updateEmail);
router.patch("/deactivate", protect, csrfProtect, deactivateAccount);
router.delete("/delete", protect, csrfProtect, deleteAccount);

export default router;
