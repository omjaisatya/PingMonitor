import mongoose from "mongoose";
import User from "../models/User.js";
import Monitor from "../models/Monitor.js";
import Log from "../models/Log.js";
import Incident from "../models/Incident.js";
import Heartbeat from "../models/Heartbeat.js";
import HeartbeatLog from "../models/HeartbeatLog.js";
import MaintenanceWindow from "../models/MaintenanceWindow.js";
import MonitorStats from "../models/MonitorStats.js";
import { dispatchHeartbeatNotifications } from "../services/heartbeatNotificationService.js";

const generateSvgBadge = (label, statusText, statusColor) => {
  const labelClean = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const statusClean = statusText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const labelWidth = Math.max(65, labelClean.length * 7.2 + 16);
  const statusWidth = Math.max(55, statusClean.length * 7.2 + 16);
  const totalWidth = labelWidth + statusWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" viewBox="0 0 ${totalWidth} 20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${totalWidth}" height="20" rx="4" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#24292e" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${statusColor}" d="M${labelWidth} 0h${statusWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="11" font-weight="600">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${labelClean}</text>
    <text x="${labelWidth / 2}" y="14">${labelClean}</text>
    <text x="${labelWidth + statusWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${statusClean}</text>
    <text x="${labelWidth + statusWidth / 2}" y="14">${statusClean}</text>
  </g>
</svg>`;
};

const findUserBySlugOrId = async (slugOrId) => {
  let user = null;
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    user = await User.findById(slugOrId);
  }
  if (!user) {
    user = await User.findOne({ statusPageSlug: slugOrId });
  }
  return user;
};

export const getPublicStatus = async (req, res) => {
  try {
    const { slugOrUserId } = req.params;
    const user = await findUserBySlugOrId(slugOrUserId);

    if (!user) {
      return res.status(404).json({ message: "Status page not found" });
    }

    if (user.isDeactivated || !user.statusPageEnabled) {
      return res
        .status(403)
        .json({ message: "This status page is not available" });
    }

    const showUrl = user.statusPageShowUrl !== false;
    const candlePeriod = user.statusPageCandlePeriod || "minutes";

    const selectFields = showUrl
      ? "name url status updatedAt interval"
      : "name status updatedAt interval";

    const monitors = await Monitor.find({
      userId: user._id,
      isActive: true,
    }).select(selectFields);

    const monitorsWithLogs = await Promise.all(
      monitors.map(async (monitor) => {
        let recentLogs = [];

        if (candlePeriod === "day") {
          const stats = await MonitorStats.find({ monitorId: monitor._id })
            .sort({ date: -1 })
            .limit(15);
          recentLogs = stats.map((s, index) => ({
            status: s.downCount > 0 ? "down" : "up",
            statusCode: s.downCount > 0 ? 500 : 200,
            responseTime: s.responseTimeCount > 0 ? Math.round(s.responseTimeSum / s.responseTimeCount) : null,
            timestamp: s.date,
            _id: s._id || index,
          })).reverse();
        } else if (candlePeriod === "month") {
          const monthlyAgg = await MonitorStats.aggregate([
            {
              $match: {
                monitorId: monitor._id,
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$date" },
                  month: { $month: "$date" },
                },
                downCount: { $sum: "$downCount" },
                responseTimeSum: { $sum: "$responseTimeSum" },
                responseTimeCount: { $sum: "$responseTimeCount" },
                date: { $first: "$date" },
              },
            },
            {
              $sort: { "_id.year": -1, "_id.month": -1 },
            },
            {
              $limit: 12,
            },
          ]);

          recentLogs = monthlyAgg.map((m, index) => {
            const d = new Date(m.date);
            d.setDate(1);
            return {
              status: m.downCount > 0 ? "down" : "up",
              statusCode: m.downCount > 0 ? 500 : 200,
              responseTime: m.responseTimeCount > 0 ? Math.round(m.responseTimeSum / m.responseTimeCount) : null,
              timestamp: d,
              _id: `${m._id.year}-${m._id.month}`,
            };
          }).reverse();
        } else {
          const logs = await Log.find({ monitorId: monitor._id, region: { $in: ["quorum", "central"] } })
            .sort({ timestamp: -1 })
            .limit(15)
            .select("status statusCode responseTime timestamp");
          recentLogs = logs.reverse();
        }

        return {
          ...monitor.toObject(),
          recentLogs,
        };
      }),
    );

    const publicIncidents = await Incident.find({
      userId: user._id,
      isPublic: true,
    })
      .sort({ startedAt: -1 })
      .limit(20)
      .select(
        "title summary severity state affectedServices timeline rootCauseAnalysis startedAt resolvedAt updatedAt",
      );

    const maintenanceWindows = await MaintenanceWindow.find({
      userId: user._id,
      status: { $in: ["scheduled", "active"] },
    }).select("title description startTime endTime status timezone");

    let systemStatus = "all_operational";
    if (monitors.length === 0) {
      systemStatus = "unknown";
    } else {
      const downCount = monitors.filter((m) => m.status === "down").length;
      if (downCount === monitors.length) {
        systemStatus = "major_outage";
      } else if (downCount > 0) {
        systemStatus = "partial_outage";
      }
    }

    res.json({
      title: user.statusPageTitle,
      description: user.statusPageDescription,
      systemStatus,
      candlePeriod,
      monitors: monitorsWithLogs,
      incidents: publicIncidents,
      maintenanceWindows,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonitorBadge = async (req, res) => {
  try {
    const { monitorId } = req.params;

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    if (!mongoose.Types.ObjectId.isValid(monitorId)) {
      const svg = generateSvgBadge("monitor", "invalid id", "#6b7280");
      return res.send(svg);
    }

    const monitor = await Monitor.findById(monitorId);
    if (!monitor) {
      const svg = generateSvgBadge("monitor", "not found", "#6b7280");
      return res.send(svg);
    }

    let statusText = "UNKNOWN";
    let statusColor = "#6b7280";

    if (monitor.status === "up") {
      statusText = "UP";
      statusColor = "#10b981";
    } else if (monitor.status === "down") {
      statusText = "DOWN";
      statusColor = "#ef4444";
    }

    const svg = generateSvgBadge(monitor.name, statusText, statusColor);
    res.send(svg);
  } catch (error) {
    const svg = generateSvgBadge("monitor", "error", "#ef4444");
    res.send(svg);
  }
};

export const getUserBadge = async (req, res) => {
  try {
    const { slugOrUserId } = req.params;

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    const user = await findUserBySlugOrId(slugOrUserId);
    if (!user || user.isDeactivated || !user.statusPageEnabled) {
      const svg = generateSvgBadge("status", "not available", "#6b7280");
      return res.send(svg);
    }

    const monitors = await Monitor.find({ userId: user._id, isActive: true });

    let statusText = "OPERATIONAL";
    let statusColor = "#10b981";

    if (monitors.length === 0) {
      statusText = "NO MONITORS";
      statusColor = "#6b7280";
    } else {
      const downCount = monitors.filter((m) => m.status === "down").length;
      if (downCount === monitors.length) {
        statusText = "MAJOR OUTAGE";
        statusColor = "#ef4444";
      } else if (downCount > 0) {
        statusText = "PARTIAL OUTAGE";
        statusColor = "#f59e0b";
      }
    }

    const title = user.statusPageTitle || "status";
    const svg = generateSvgBadge(title, statusText, statusColor);
    res.send(svg);
  } catch (error) {
    const svg = generateSvgBadge("status", "error", "#ef4444");
    res.send(svg);
  }
};

const getIntervalMinutes = (interval) => {
  switch (interval) {
    case "1min":
      return 1;
    case "5min":
      return 5;
    case "15min":
      return 15;
    case "hourly":
      return 60;
    case "daily":
      return 1440;
    default:
      return 5;
  }
};

export const pingHeartbeat = async (req, res) => {
  try {
    const { token } = req.params;
    const heartbeat = await Heartbeat.findOne({ token });

    if (!heartbeat) {
      return res.status(404).json({ message: "Heartbeat endpoint not found" });
    }

    if (!heartbeat.isActive) {
      return res.status(400).json({ message: "Heartbeat monitor is paused" });
    }

    const now = new Date();
    const prevStatus = heartbeat.status;
    const intervalMinutes = getIntervalMinutes(heartbeat.interval);

    heartbeat.status = "up";
    heartbeat.lastPingAt = now;
    heartbeat.nextExpectedPingAt = new Date(
      now.getTime() + intervalMinutes * 60 * 1000,
    );
    heartbeat.consecutiveMissed = 0;
    heartbeat.pingCount += 1;
    heartbeat.upCount += 1;

    await heartbeat.save();

    await HeartbeatLog.create({
      heartbeatId: heartbeat._id,
      status: "up",
      ip: req.ip,
      userAgent: req.headers["user-agent"] || null,
      timestamp: now,
    });

    if (prevStatus === "down") {
      const message = `Heartbeat monitor ${heartbeat.name} is back UP (successful check-in)`;
      await dispatchHeartbeatNotifications(heartbeat, "recovered", message);
    }

    return res.status(200).json({
      message: "Heartbeat received successfully",
      status: "up",
      lastPingAt: heartbeat.lastPingAt,
      nextExpectedPingAt: heartbeat.nextExpectedPingAt,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error recording heartbeat ping",
      error: error.message,
    });
  }
};
