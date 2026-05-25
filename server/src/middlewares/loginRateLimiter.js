import { rateLimit, ipKeyGenerator } from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,

  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);

    return `${ip}-${req.body.email?.toLowerCase() || "unknown"}`;
  },

  message: {
    message: "Too many login attempts, please try again later",
  },

  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
