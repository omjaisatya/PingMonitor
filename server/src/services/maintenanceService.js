import MaintenanceWindow from "../models/MaintenanceWindow.js";

/**
 * Checks if a monitor is currently in an active maintenance window.
 * @param {ObjectId|string} entityId The ID of the monitor, synthetic, api, or heartbeat
 * @param {string} type One of: 'monitor', 'synthetic', 'api', 'heartbeat'
 * @returns {boolean} True if maintenance is active
 */
export const isMaintenanceActive = async (entityId, type) => {
  try {
    let queryField = "";
    if (type === "monitor") queryField = "monitors";
    else if (type === "synthetic") queryField = "syntheticMonitors";
    else if (type === "api") queryField = "apiMonitors";
    else if (type === "heartbeat") queryField = "heartbeats";
    else return false;

    const activeWindow = await MaintenanceWindow.findOne({
      status: "active",
      [queryField]: entityId,
    });

    return !!activeWindow;
  } catch (error) {
    console.error("isMaintenanceActive check failed:", error);
    return false;
  }
};

export const evaluateMaintenanceWindows = async () => {
  const now = new Date();

  try {
    const toActivate = await MaintenanceWindow.find({
      status: "scheduled",
      startTime: { $lte: now },
    });

    for (const win of toActivate) {
      if (win.endTime <= now) {
        win.status = "completed";
      } else {
        win.status = "active";
      }
      await win.save();
      console.log(`Maintenance Window ${win._id} activated.`);
    }

    const toComplete = await MaintenanceWindow.find({
      status: "active",
      endTime: { $lte: now },
    });

    for (const win of toComplete) {
      win.status = "completed";
      await win.save();
      console.log(`Maintenance Window ${win._id} completed.`);

      if (win.recurringFrequency && win.recurringFrequency !== "none") {
        const nextStart = new Date(win.startTime);
        const nextEnd = new Date(win.endTime);

        if (win.recurringFrequency === "daily") {
          nextStart.setDate(nextStart.getDate() + 1);
          nextEnd.setDate(nextEnd.getDate() + 1);
        } else if (win.recurringFrequency === "weekly") {
          nextStart.setDate(nextStart.getDate() + 7);
          nextEnd.setDate(nextEnd.getDate() + 7);
        } else if (win.recurringFrequency === "monthly") {
          nextStart.setMonth(nextStart.getMonth() + 1);
          nextEnd.setMonth(nextEnd.getMonth() + 1);
        }

        await MaintenanceWindow.create({
          userId: win.userId,
          title: win.title,
          description: win.description,
          startTime: nextStart,
          endTime: nextEnd,
          timezone: win.timezone,
          recurringFrequency: win.recurringFrequency,
          status: "scheduled",
          monitors: win.monitors,
          syntheticMonitors: win.syntheticMonitors,
          apiMonitors: win.apiMonitors,
          heartbeats: win.heartbeats,
        });
        console.log(`Cloned recurring Maintenance Window for ${win._id}.`);
      }
    }
  } catch (error) {
    console.error("evaluateMaintenanceWindows failed:", error);
  }
};
