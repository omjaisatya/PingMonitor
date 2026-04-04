import express from "express";
import routerAuth from "./routes/authRoutes.js";
import routerMon from "./routes/monitorRoutes.js";
import cors from "cors";
import { FRONTEND_URL } from "./config/env.config.js";

//initialize express
const app = express();

// i'll change this origin once frontend complete and deploy so, currently i set it for all domain. Anyone can request from all site
let corsOptions = {
  origin: "*" || FRONTEND_URL,
};

// middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/auth", routerAuth);
app.use("/api/monitors", routerMon);

// main home url
app.get("/", (req, res) => {
  res.json({ message: "Ping monitor is live" });
});

app.use((req, res, next) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || "An Unexpexted server error",
  });
});

export default app;
