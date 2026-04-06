import express from "express";
import checkApiHealth from "../controllers/healthController.js";

const router = express.Router();

router.get("/health", checkApiHealth);

export default router;
