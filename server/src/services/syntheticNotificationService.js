import axios from "axios";
import User from "../models/User.js";
import InAppNotification from "../models/InAppNotification.js";
import AlertLog from "../models/AlertLog.js";
import SyntheticMonitor from "../models/SyntheticMonitor.js";
import { sendSyntheticAlert } from "./emailService.js";
import { isMaintenanceActive } from "./maintenanceService.js";

export const dispatchSyntheticNotifications = async (
  monitor,
  eventType,
  message,
  errorMsg = "",
) => {
  try {
    const isMaintenance = await isMaintenanceActive(monitor._id, "synthetic");
    if (isMaintenance) {
      console.log(
        `Alert suppressed for synthetic ${monitor.name} due to active maintenance window.`,
      );
      return;
    }
    if (eventType === "down") {
      if (monitor.lastAlertedAt && monitor.alertCooldown) {
        const elapsedMin =
          (Date.now() - new Date(monitor.lastAlertedAt).getTime()) /
          (1000 * 60);
        if (elapsedMin < monitor.alertCooldown) {
          console.log(
            `Synthetic Deduplication: Skipping alert for ${monitor.name}. Cooldown active (${Math.round(elapsedMin)}/${monitor.alertCooldown}m).`,
          );
          return;
        }
      }
    }

    const delivery = {
      email: monitor.alertChannels?.email ? "pending" : "disabled",
      webhook: monitor.alertChannels?.webhook ? "pending" : "disabled",
      inApp: monitor.alertChannels?.inApp ? "pending" : "disabled",
    };
    const errorDetails = { email: null, webhook: null };

    if (delivery.webhook === "pending" && monitor.webhookUrl) {
      try {
        await axios.post(
          monitor.webhookUrl,
          {
            event: `synthetic.${eventType}`,
            syntheticMonitor: {
              id: monitor._id,
              name: monitor.name,
              status: eventType === "down" ? "down" : "up",
              message,
              error: errorMsg,
              timestamp: new Date().toISOString(),
            },
          },
          { timeout: 3000 },
        );
        delivery.webhook = "sent";
      } catch (err) {
        console.error(
          `Synthetic Webhook failed for ${monitor.name}:`,
          err.message,
        );
        delivery.webhook = "failed";
        errorDetails.webhook = err.message;
      }
    } else if (delivery.webhook === "pending") {
      delivery.webhook = "disabled";
    }

    if (delivery.inApp === "pending") {
      try {
        await InAppNotification.create({
          userId: monitor.userId,
          monitorId: monitor._id,
          message,
          status: eventType === "down" ? "down" : "up",
        });
        delivery.inApp = "sent";
      } catch (err) {
        console.error(`Synthetic In-App notification failed:`, err.message);
        delivery.inApp = "failed";
      }
    }

    if (delivery.email === "pending") {
      try {
        const user = await User.findById(monitor.userId);
        if (user && user.isVerified !== false) {
          const recipients = [user.email, ...(monitor.escalationEmails || [])];
          const formattedDate = new Date().toLocaleString("en-US", {
            timeZone: monitor.timezone || "UTC",
            dateStyle: "medium",
            timeStyle: "medium",
          });

          await sendSyntheticAlert({
            syntheticMonitorName: monitor.name,
            email: recipients,
            formateDate: formattedDate,
            alertType: eventType === "down" ? "down" : "recovered",
            errorMsg,
          });
          delivery.email = "sent";
        } else {
          delivery.email = "disabled";
        }
      } catch (err) {
        console.error(`Synthetic Email failed:`, err.message);
        delivery.email = "failed";
        errorDetails.email = err.message;
      }
    }

    if (
      (delivery.email === "sent" ||
        delivery.webhook === "sent" ||
        delivery.inApp === "sent") &&
      eventType === "down"
    ) {
      await SyntheticMonitor.findByIdAndUpdate(monitor._id, {
        lastAlertedAt: new Date(),
      });
    }

    await AlertLog.create({
      monitorId: monitor._id,
      status: eventType === "down" ? "down" : "recovered",
      statusCode: eventType === "down" ? 500 : 200,
      responseTime: 0,
      message,
      timestamp: new Date(),
      delivery,
      errorDetails,
    });
  } catch (err) {
    console.error("Synthetic notifications runner failure:", err.message);
  }
};
