import express from "express";
import routerAuth from "./routes/authRoutes.js";
import routerMon from "./routes/monitorRoutes.js";

//initialize express
const app = express();

// middleware
app.use(express.json());
app.use("/api/auth", routerAuth);
app.use("/api/monitors", routerMon);

// main home url
app.get("/", (req, res) => {
  res.json({ message: "Ping monitor is live" });
});

export default app;
