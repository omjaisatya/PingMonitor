import express from "express";
import { rateLimit } from "express-rate-limit";
import {
  subscribe,
  verifyCode,
  verifyToken,
  getSubscriber,
  unsubscribe,
} from "../controllers/subscriberController.js";

const subscribeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 10, // Max 10 requests per IP per window
  message: { message: "Too many subscription attempts. Please try again after 10 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router.post("/", subscribeLimiter, subscribe);
router.post("/verify-code", subscribeLimiter, verifyCode);
router.get("/verify", verifyToken);
router.get("/:subscriberId", getSubscriber);
router.post("/unsubscribe", unsubscribe);

export default router;
