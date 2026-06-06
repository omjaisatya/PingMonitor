import Log from "../models/Log.js";
import Monitor from "../models/Monitor.js";
import { getRegionalBreakdown } from "../services/regionalAggregationService.js";
import { emitIncidentEvent } from "../services/realtimeService.js";

const createMonitor = async (req, res) => {
  try {
    const {
      name,
      url,
      interval,
      timezone,
      alertChannels,
      webhookUrl,
      escalationEmails,
      retryLimit,
      latencyThreshold,
      alertCooldown,
      quietHours,
      notifyOnRecovery,
      recoveryAlertDelay,
    } = req.body;
    console.log("received timezone", timezone);

    const checkUrl = await Monitor.findOne({
      userId: req.user._id,
      url: url.trim(),
    });

    if (checkUrl) {
      return res.status(409).json({
        message: `You're already monitoring this url ${checkUrl.name}`,
      });
    }

    const createMonitor = await Monitor.create({
      userId: req.user._id,
      name: name.trim(),
      url: url.trim(),
      interval: interval || 10,
      timezone: timezone || "UTC",
      alertChannels: {
        email: alertChannels?.email ?? true,
        webhook: alertChannels?.webhook ?? false,
        inApp: alertChannels?.inApp ?? true,
      },
      webhookUrl: webhookUrl || "",
      escalationEmails: escalationEmails || [],
      retryLimit: retryLimit !== undefined ? Number(retryLimit) : 1,
      latencyThreshold: latencyThreshold !== undefined ? Number(latencyThreshold) : 2000,
      alertCooldown: alertCooldown !== undefined ? Number(alertCooldown) : 30,
      quietHours: {
        enabled: quietHours?.enabled ?? false,
        start: quietHours?.start || "22:00",
        end: quietHours?.end || "08:00",
      },
      notifyOnRecovery: notifyOnRecovery !== undefined ? !!notifyOnRecovery : true,
      recoveryAlertDelay: recoveryAlertDelay !== undefined ? Number(recoveryAlertDelay) : 0,
    });

    try {
      emitIncidentEvent(req.user._id, "monitor:created", { monitor: createMonitor });
    } catch (err) {
      console.error("Failed to emit WebSocket monitor:created event:", err);
    }

    return res
      .status(201)
      .json({ message: "Monitor created", monitor: createMonitor });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Unexpected error", error: error.message });
  }
};

// get all monitor for logged in user
const getMonitors = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit) || 6; // default 6 monitors per page

    const query = { userId: req.user._id };

    if (!isNaN(page)) {
      const skip = (page - 1) * limit;
      const total = await Monitor.countDocuments(query);
      const allMonitors = await Monitor.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.status(200).json({
        count: total,
        allMonitors,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      // return all monitors (original behavior)
      const allMonitors = await Monitor.find(query).sort({
        createdAt: -1,
      });
      return res.status(200).json({ count: allMonitors.length, allMonitors });
    }
  } catch (error) {
    return res.status(500).json({
      message: "There is Server Error, try again later",
      error: error.message,
    });
  }
};

const getMonitorById = async (req, res) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!monitor)
      return res
        .status(404)
        .json({ message: "Monitor not found, try creating one" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const queryObj = { monitorId: monitor._id };
    if (req.query.status && req.query.status !== "all") {
      queryObj.status = req.query.status;
    }

    const totalLogs = await Log.countDocuments(queryObj);

    const logs = await Log.find(queryObj)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const regionalBreakdown = await getRegionalBreakdown(monitor._id);

    res.status(200).json({
      monitor,
      logs,
      regionalBreakdown,
      pagination: {
        total: totalLogs,
        page,
        limit,
        totalPages: Math.ceil(totalLogs / limit),
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "There is Server Error", error: error.message });
  }
};

const updateMonitor = async (req, res) => {
  try {
    const {
      name,
      url,
      interval,
      timezone,
      alertChannels,
      webhookUrl,
      escalationEmails,
      retryLimit,
      latencyThreshold,
      alertCooldown,
      quietHours,
      notifyOnRecovery,
      recoveryAlertDelay,
    } = req.body;

    if (url) {
      const duplicateUrl = await Monitor.findOne({
        userId: req.user._id,
        url: url.trim(),
        _id: { $ne: req.params.id },
      });

      if (duplicateUrl) {
        return res.status(409).json({
          message: `You're already monitoring this URL ${duplicateUrl.name}`,
        });
      }
    }

    const updateObj = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (url !== undefined) updateObj.url = url.trim();
    if (interval !== undefined) updateObj.interval = Number(interval);
    if (timezone !== undefined) updateObj.timezone = timezone;
    if (webhookUrl !== undefined) updateObj.webhookUrl = webhookUrl;
    if (escalationEmails !== undefined) updateObj.escalationEmails = escalationEmails;
    if (retryLimit !== undefined) updateObj.retryLimit = Number(retryLimit);
    if (latencyThreshold !== undefined) updateObj.latencyThreshold = Number(latencyThreshold);
    if (alertCooldown !== undefined) updateObj.alertCooldown = Number(alertCooldown);
    if (notifyOnRecovery !== undefined) updateObj.notifyOnRecovery = !!notifyOnRecovery;
    if (recoveryAlertDelay !== undefined) updateObj.recoveryAlertDelay = Number(recoveryAlertDelay);
    
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

    const monitor = await Monitor.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      updateObj,
      { returnDocument: "after", runValidators: true }
    );

    if (!monitor)
      return res
        .status(404)
        .json({ message: "Monitor not found, try creating new monitor" });

    try {
      emitIncidentEvent(req.user._id, "monitor:updated", { monitor });
    } catch (err) {
      console.error("Failed to emit WebSocket monitor:updated event:", err);
    }

    return res.status(200).json({ message: "Successfully Updated", monitor });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "There is Server Error", error: error.message });
  }
};

// update isActive for pause features in monitor
const pauseToggleMonitor = async (req, res) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!monitor)
      return res
        .status(404)
        .json({ message: "Monitor not found, try creating one" });

    monitor.isActive = !monitor.isActive;

    if (!monitor.isActive) {
      monitor.status = "unknown";
    }

    await monitor.save();

    try {
      emitIncidentEvent(req.user._id, "monitor:updated", { monitor });
    } catch (err) {
      console.error("Failed to emit WebSocket monitor:updated event:", err);
    }

    return res
      .status(200)
      .json({ message: "Successfully update monitor toggle", monitor });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update toggle monitor",
      error: error.message,
    });
  }
};

const deleteMonitor = async (req, res) => {
  try {
    const monitor = await Monitor.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    // clean all logs to saved in monitor
    await Log.deleteMany({ monitorId: monitor._id });

    try {
      emitIncidentEvent(req.user._id, "monitor:deleted", { monitorId: req.params.id });
    } catch (err) {
      console.error("Failed to emit WebSocket monitor:deleted event:", err);
    }

    res.status(200).json({ message: "Monitor and its logs deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "There is Server error", error: error.message });
  }
};

export {
  getMonitors,
  createMonitor,
  getMonitorById,
  updateMonitor,
  deleteMonitor,
  pauseToggleMonitor,
};
