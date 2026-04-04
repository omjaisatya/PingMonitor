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

export default app;
