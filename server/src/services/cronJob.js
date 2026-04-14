import cron from "node-cron";
import axios from "axios";
import Monitor from "../models/Monitor.js";
import Log from "../models/Log.js";
import User from "../models/User.js";
import sendAlert from "./emailService.js";

const pingmonitor = async (monitor) => {
  const start = Date.now();
  let status = "down";
  let statusCode = null;
  let responseTime = null;

  // formate Date for mail
  const currentDate = new Date();
  const formateDate = currentDate.toLocaleString("en-US", {
    timeZone: Monitor.timezone,
    dateStyle: "medium",
    timeStyle: "medium",
  });

  try {
    const response = await axios.get(monitor.url, { timeout: 1000 });
    responseTime = Date.now() - start;
    statusCode = response.status;

    status = response.status < 400 ? "up" : "down";
  } catch (error) {
    responseTime = Date.now() - start;
    statusCode = error.response ? error.response.status : null;
  }

  await Log.create({
    monitorId: monitor._id,
    status,
    statusCode,
    responseTime,
  });

  const previousStatus = monitor.status;
  if (status === "down" && previousStatus !== "down") {
    try {
      const user = await User.findById(monitor.userId);
      if (user) {
        await sendAlert({
          monitorName: monitor.name,
          url: monitor.url,
          statusCode,
          responseTime,
          email: user.email,
          formateDate,
        });
        console.log(
          `alert mail send to ${user.email} for monitor: ${monitor.name}`,
        );
      }
    } catch (emailError) {
      console.error(
        `Failed to send alert for ${monitor.name}:`,
        emailError.message,
      );
    }
  }

  await Monitor.findByIdAndUpdate(monitor._id, { status });
  console.log(
    `[${new Date().toLocaleTimeString()}] ${monitor.name} → ${status.toUpperCase()} (${statusCode}) ${responseTime}ms`,
  );
};

const startCron = () => {
  cron.schedule("* * * * *", async () => {
    console.log("cron is started - checking monitor");

    try {
      const monitors = await Monitor.find({ isActive: true }); //only resume

      if (monitors.length === 0) {
        console.log("No monitor find");
        return;
      }

      await Promise.allSettled(monitors.map((monitor) => pingmonitor(monitor)));
    } catch (error) {
      console.log("cron error", error.message);
    }
  });
};

export default startCron;
