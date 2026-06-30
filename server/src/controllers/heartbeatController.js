import crypto from "crypto";
import Heartbeat from "../models/Heartbeat.js";
import HeartbeatLog from "../models/HeartbeatLog.js";

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

const createHeartbeat = async (req, res) => {
  try {
    const {
      name,
      interval,
      gracePeriod,
      alertChannels,
      webhookUrl,
      escalationEmails,
      alertCooldown,
      timezone,
      quietHours,
    } = req.body;

    if (!name || !interval) {
      return res
        .status(400)
        .json({ message: "Name and interval are required" });
    }

    const allowedIntervals = ["1min", "5min", "15min", "hourly", "daily"];
    if (!allowedIntervals.includes(interval)) {
      return res.status(400).json({ message: "Invalid interval choice" });
    }

    const token = crypto.randomUUID();
    const intervalMinutes = getIntervalMinutes(interval);

    const heartbeat = await Heartbeat.create({
      userId: req.user._id,
      name: name.trim(),
      token,
      interval,
      gracePeriod: gracePeriod !== undefined ? Number(gracePeriod) : 2,
      nextExpectedPingAt: new Date(Date.now() + intervalMinutes * 60 * 1000),
      alertChannels: {
        email: alertChannels?.email ?? true,
        webhook: alertChannels?.webhook ?? false,
        inApp: alertChannels?.inApp ?? true,
      },
      webhookUrl: webhookUrl || "",
      escalationEmails: escalationEmails || [],
      alertCooldown: alertCooldown !== undefined ? Number(alertCooldown) : 30,
      timezone: timezone || "UTC",
      quietHours: {
        enabled: quietHours?.enabled ?? false,
        start: quietHours?.start || "22:00",
        end: quietHours?.end || "08:00",
      },
    });

    return res
      .status(201)
      .json({ message: "Heartbeat monitor created", heartbeat });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unexpected server error", error: error.message });
  }
};

const getHeartbeats = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit) || 6;
    const query = { userId: req.user._id };

    if (!isNaN(page)) {
      const skip = (page - 1) * limit;
      const total = await Heartbeat.countDocuments(query);
      const heartbeats = await Heartbeat.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.status(200).json({
        count: total,
        heartbeats,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      const heartbeats = await Heartbeat.find(query).sort({ createdAt: -1 });
      return res.status(200).json({ count: heartbeats.length, heartbeats });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Server error retrieving heartbeats",
      error: error.message,
    });
  }
};

const getHeartbeatById = async (req, res) => {
  try {
    const heartbeat = await Heartbeat.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!heartbeat) {
      return res.status(404).json({ message: "Heartbeat monitor not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const queryObj = { heartbeatId: heartbeat._id };
    if (req.query.status && req.query.status !== "all") {
      queryObj.status = req.query.status;
    }

    const totalLogs = await HeartbeatLog.countDocuments(queryObj);
    const logs = await HeartbeatLog.find(queryObj)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      heartbeat,
      logs,
      pagination: {
        total: totalLogs,
        page,
        limit,
        totalPages: Math.ceil(totalLogs / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error retrieving heartbeat detail",
      error: error.message,
    });
  }
};

const updateHeartbeat = async (req, res) => {
  try {
    const {
      name,
      interval,
      gracePeriod,
      alertChannels,
      webhookUrl,
      escalationEmails,
      alertCooldown,
      timezone,
      quietHours,
    } = req.body;

    const updateObj = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (interval !== undefined) {
      const allowedIntervals = ["1min", "5min", "15min", "hourly", "daily"];
      if (!allowedIntervals.includes(interval)) {
        return res.status(400).json({ message: "Invalid interval choice" });
      }
      updateObj.interval = interval;
    }
    if (gracePeriod !== undefined) updateObj.gracePeriod = Number(gracePeriod);
    if (webhookUrl !== undefined) updateObj.webhookUrl = webhookUrl;
    if (escalationEmails !== undefined)
      updateObj.escalationEmails = escalationEmails;
    if (alertCooldown !== undefined)
      updateObj.alertCooldown = Number(alertCooldown);
    if (timezone !== undefined) updateObj.timezone = timezone;

    if (alertChannels !== undefined) {
      updateObj.alertChannels = {
        email: alertChannels.email ?? true,
        webhook: alertChannels.webhook ?? false,
        inApp: alertChannels.inApp ?? true,
      };
    }

    if (quietHours !== undefined) {
      updateObj.quietHours = {
        enabled: quietHours.enabled ?? false,
        start: quietHours.start || "22:00",
        end: quietHours.end || "08:00",
      };
    }

    const heartbeat = await Heartbeat.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      updateObj,
      { returnDocument: 'after', runValidators: true },
    );

    if (!heartbeat) {
      return res.status(404).json({ message: "Heartbeat monitor not found" });
    }

    return res
      .status(200)
      .json({ message: "Heartbeat monitor updated successfully", heartbeat });
  } catch (error) {
    return res.status(500).json({
      message: "Server error updating heartbeat monitor",
      error: error.message,
    });
  }
};

const pauseToggleHeartbeat = async (req, res) => {
  try {
    const heartbeat = await Heartbeat.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!heartbeat) {
      return res.status(404).json({ message: "Heartbeat monitor not found" });
    }

    heartbeat.isActive = !heartbeat.isActive;
    if (!heartbeat.isActive) {
      heartbeat.status = "unknown";
      heartbeat.nextExpectedPingAt = null;
    } else {
      heartbeat.status = "unknown";
      heartbeat.lastPingAt = null;
      const intervalMinutes = getIntervalMinutes(heartbeat.interval);
      heartbeat.nextExpectedPingAt = new Date(Date.now() + intervalMinutes * 60 * 1000);
    }

    await heartbeat.save();

    return res.status(200).json({
      message: `Heartbeat monitor ${heartbeat.isActive ? "resumed" : "paused"} successfully`,
      heartbeat,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error toggling active state",
      error: error.message,
    });
  }
};

const deleteHeartbeat = async (req, res) => {
  try {
    const heartbeat = await Heartbeat.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!heartbeat) {
      return res.status(404).json({ message: "Heartbeat monitor not found" });
    }

    await HeartbeatLog.deleteMany({ heartbeatId: heartbeat._id });

    return res
      .status(200)
      .json({ message: "Heartbeat monitor and its logs deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Server error deleting heartbeat monitor",
      error: error.message,
    });
  }
};

export {
  createHeartbeat,
  getHeartbeats,
  getHeartbeatById,
  updateHeartbeat,
  pauseToggleHeartbeat,
  deleteHeartbeat,
};
