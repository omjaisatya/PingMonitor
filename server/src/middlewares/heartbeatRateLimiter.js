import { rateLimit } from "express-rate-limit";

export const heartbeatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 30,
  message: {
    message:
      "Too many heartbeat check-ins from this source. Please wait a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
