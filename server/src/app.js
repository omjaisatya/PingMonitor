import express from "express";
import path from "path";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { swaggerUi, swaggerSpec } from "./config/swagger.js";
import routerAuth from "./routes/authRoutes.js";
import routerMon from "./routes/monitorRoutes.js";
import routerProfile from "./routes/profileRoutes.js";
import routerAnalytics from "./routes/analyticsRoutes.js";
import routerNotification from "./routes/notificationRoutes.js";
import routerPublic from "./routes/publicRoutes.js";
import routerIncidents from "./routes/incidentRoutes.js";
import routerHeartbeat from "./routes/heartbeatRoutes.js";
import routerSynthetic from "./routes/syntheticRoutes.js";
import routerApi from "./routes/apiRoutes.js";
import routerConfig from "./routes/configRoutes.js";
import routerMaintenance from "./routes/maintenanceRoutes.js";
import routerSessions from "./routes/sessionRoutes.js";
import routerSubscriber from "./routes/subscriberRoutes.js";
import cors from "cors";
import { FRONTEND_URL } from "./config/env.config.js";
import health from "./routes/healthRoute.js";
import { rateLimit } from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  message: "To many requests, Please try again",
  standardHeaders: true,
  legacyHeaders: false,
});

//initialize express
const app = express();

app.set("trust proxy", 1);

app.use((req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    const duration = (performance.now() - start).toFixed(2);
    console.log(
      `[API Log] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`,
    );
  });
  next();
});

let corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
};

// helmet security middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api-docs")) {
    next();
  } else {
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })(req, res, next);
  }
});
app.use((req, res, next) => {
  if (req.path.startsWith("/api-docs")) {
    next();
  } else {
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", FRONTEND_URL],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    })(req, res, next);
  }
});

// middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// apihealth check
app.use("/api", health);

// Swagger Documentation Route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// main home url
app.get("/", (req, res) => {
  res.json({ message: "Ping monitor is live" });
});

app.get("/status-widget.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.join(process.cwd(), "src", "utils", "status-widget.js"));
});

// protected
app.use("/api/public", routerPublic);
app.use("/api/public/subscribe", routerSubscriber);
app.use("/api/auth", limiter, routerAuth);
app.use("/api/auth/profile", routerProfile);
app.use("/api/profile/sessions", routerSessions);
app.use("/api/monitors", routerMon);
app.use("/api/analytics", routerAnalytics);
app.use("/api/notifications", routerNotification);
app.use("/api/incidents", routerIncidents);
app.use("/api/heartbeats", routerHeartbeat);
app.use("/api/synthetic-monitors", routerSynthetic);
app.use("/api/api-monitors", routerApi);
app.use("/api/maintenance", routerMaintenance);
app.use("/api/config", routerConfig);

app.use("/uploads", express.static("uploads"));

// move error and global error handling in middleware
app.use((req, res, next) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || "An Unexpexted server error",
  });
});

// todo: implement user profile page section where user can change their password or email.
// todo: implement forget password if user request
// todo: implement userverify when they register account, to prevent spam.
// todo: implement user recovery password

export default app;
