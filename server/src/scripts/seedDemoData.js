import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Monitor from "../models/Monitor.js";
import SyntheticMonitor from "../models/SyntheticMonitor.js";
import ApiMonitor from "../models/ApiMonitor.js";
import Heartbeat from "../models/Heartbeat.js";

export const seedDemoData = async () => {
  try {
    const email = "demo@example.com";

    let user = await User.findOne({ email });
    if (user) {
      await Monitor.deleteMany({ userId: user._id });
      await SyntheticMonitor.deleteMany({ userId: user._id });
      await ApiMonitor.deleteMany({ userId: user._id });
      await Heartbeat.deleteMany({ userId: user._id });
      await User.deleteOne({ email });
    }

    const hashPass = await bcrypt.hash("demo1234", 12);
    user = await User.create({
      name: "Demo User",
      email,
      password: hashPass,
      isVerified: true,
    });

    await Monitor.create({
      userId: user._id,
      name: "Main Landing Page",
      url: "https://google.com",
      status: "up",
      isActive: true,
      interval: 5,
      alertChannels: { email: false, webhook: false, inApp: true },
    });

    await Monitor.create({
      userId: user._id,
      name: "Payment Gateway",
      url: "https://stripe.com",
      status: "up",
      isActive: true,
      interval: 5,
      alertChannels: { email: false, webhook: false, inApp: true },
    });

    await Monitor.create({
      userId: user._id,
      name: "Legacy Subsystem",
      url: "https://httpstat.us/500",
      status: "down",
      isActive: true,
      interval: 1,
      alertChannels: { email: false, webhook: false, inApp: true },
    });

    await SyntheticMonitor.create({
      userId: user._id,
      name: "User Login Flow",
      isActive: true,
      interval: 60,
      script: `const { test, expect } = require('@playwright/test');\ntest('login', async ({ page }) => {\n  await page.goto('https://example.com');\n  // Demo steps\n});`,
      timeout: 30000,
    });

    await ApiMonitor.create({
      userId: user._id,
      name: "GitHub API Search",
      url: "https://api.github.com/search/repositories?q=pingmonitor",
      method: "GET",
      isActive: true,
      interval: 15,
      assertions: [
        { type: "statusCode", property: "", operator: "equals", target: "200" },
      ],
    });

    await Heartbeat.create({
      userId: user._id,
      name: "Nightly Database Backup",
      token: "backup-cron-demo-token",
      interval: "daily",
      gracePeriod: 30,
      isActive: true,
    });

    console.log("Demo data seeded successfully.");
  } catch (error) {
    console.error("Demo seeding failed:", error);
  }
};
