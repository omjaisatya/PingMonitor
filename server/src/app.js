import express from "express";
import routerAuth from "./routes/authRoutes.js";
import routerMon from "./routes/monitorRoutes.js";
import cors from "cors";
import { FRONTEND_URL } from "./config/env.config.js";
import health from "./routes/healthRoute.js";
import { rateLimit } from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "To many requests, Please try again",
  standardHeaders: true,
  legacyHeaders: false,
});

//initialize express
const app = express();

let corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
};

// middleware
app.use(cors(corsOptions));
app.use(express.json());

// apihealth check
app.use("/api", health);

// main home url
app.get("/", (req, res) => {
  res.json({ message: "Ping monitor is live" });
});

// protected
app.use("/api/auth", limiter, routerAuth);
app.use("/api/monitors", limiter, routerMon);

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
