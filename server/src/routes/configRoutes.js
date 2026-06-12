import express from "express";
import { IS_DEMO_MODE } from "../config/env.config.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    isDemoMode: IS_DEMO_MODE,
  });
});

export default router;
