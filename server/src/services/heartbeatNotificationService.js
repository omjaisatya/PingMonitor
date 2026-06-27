import axios from "axios";
import User from "../models/User.js";
import InAppNotification from "../models/InAppNotification.js";
import AlertLog from "../models/AlertLog.js";
import Heartbeat from "../models/Heartbeat.js";
import { sendHeartbeatAlert } from "./emailService.js";
import { isMaintenanceActive } from "./maintenanceService.js";

export const dispatchHeartbeatNotifications = async (
  heartbeat,
  eventType,
  message,
) => {
  try {
    const isMaintenance = await isMaintenanceActive(heartbeat._id, "heartbeat");
    if (isMaintenance) {
      console.log(
        `Alert suppressed for heartbeat ${heartbeat.name} due to active maintenance window.`,
      );
      return;
    }
    if (eventType === "down") {
      if (heartbeat.lastAlertedAt && heartbeat.alertCooldown) {
        const elapsedMin =
          (Date.now() - new Date(heartbeat.lastAlertedAt).getTime()) /
          (1000 * 60);
        if (elapsedMin < heartbeat.alertCooldown) {
          console.log(
            `Heartbeat Deduplication: Skipping alert for ${heartbeat.name}. Cooldown active (${Math.round(elapsedMin)}/${heartbeat.alertCooldown}m).`,
          );
          return;
        }
      }
    }

    const delivery = {
      email: heartbeat.alertChannels?.email ? "pending" : "disabled",
      webhook: heartbeat.alertChannels?.webhook ? "pending" : "disabled",
      inApp: heartbeat.alertChannels?.inApp ? "pending" : "disabled",
    };
    const errorDetails = { email: null, webhook: null };

    if (delivery.webhook === "pending" && heartbeat.webhookUrl) {
      try {
        await axios.post(
          heartbeat.webhookUrl,
          {
            event: `heartbeat.${eventType}`,
            heartbeat: {
              id: heartbeat._id,
              name: heartbeat.name,
              status: eventType === "down" ? "down" : "up",
              message,
              timestamp: new Date().toISOString(),
            },
          },
          { timeout: 3000 },
        );
        delivery.webhook = "sent";
      } catch (err) {
        console.error(
          `Heartbeat Webhook failed for ${heartbeat.name}:`,
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
          userId: heartbeat.userId,
          monitorId: heartbeat._id,
          message,
          status: eventType === "down" ? "down" : "up",
        });
        delivery.inApp = "sent";
      } catch (err) {
        console.error(`Heartbeat In-App notification failed:`, err.message);
        delivery.inApp = "failed";
      }
    }

    if (delivery.email === "pending") {
      try {
        const user = await User.findById(heartbeat.userId);
        if (user && user.isVerified !== false) {
          const recipients = [
            user.email,
            ...(heartbeat.escalationEmails || []),
          ];
          const formattedDate = new Date().toLocaleString("en-US", {
            timeZone: heartbeat.timezone || "UTC",
            dateStyle: "medium",
            timeStyle: "medium",
          });

          await sendHeartbeatAlert({
            heartbeatName: heartbeat.name,
            email: recipients,
            formateDate: formattedDate,
            alertType: eventType === "down" ? "down" : "recovered",
          });
          delivery.email = "sent";
        } else {
          delivery.email = "disabled";
        }
      } catch (err) {
        console.error(`Heartbeat Email failed:`, err.message);
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
      await Heartbeat.findByIdAndUpdate(heartbeat._id, {
        lastAlertedAt: new Date(),
      });
    }

    await AlertLog.create({
      monitorId: heartbeat._id,
      status: eventType === "down" ? "down" : "recovered",
      statusCode: eventType === "down" ? 500 : 200,
      responseTime: 0,
      message,
      timestamp: new Date(),
      delivery,
      errorDetails,
    });
  } catch (err) {
    console.error("Heartbeat notifications runner failure:", err.message);
  }
};
