import mongoose from "mongoose";
import User from "../models/User.js";
import Monitor from "../models/Monitor.js";
import Log from "../models/Log.js";
import Incident from "../models/Incident.js";

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

    const monitors = await Monitor.find({
      userId: user._id,
      isActive: true,
    }).select("name url status updatedAt interval");

    const monitorsWithLogs = await Promise.all(
      monitors.map(async (monitor) => {
        const logs = await Log.find({ monitorId: monitor._id })
          .sort({ timestamp: -1 })
          .limit(15)
          .select("status statusCode responseTime timestamp");

        return {
          ...monitor.toObject(),
          recentLogs: logs.reverse(),
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
      monitors: monitorsWithLogs,
      incidents: publicIncidents,
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
