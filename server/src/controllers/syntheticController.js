import SyntheticMonitor from "../models/SyntheticMonitor.js";
import SyntheticRun from "../models/SyntheticRun.js";
import { isRedisQueueEnabled, getQueues } from "../services/queueService.js";
import { processSyntheticCheck } from "../workers/syntheticWorker.js";

export const createSyntheticMonitor = async (req, res) => {
  try {
    const {
      name,
      script,
      interval,
      timeout,
      alertChannels,
      webhookUrl,
      escalationEmails,
      alertCooldown,
      timezone,
      quietHours,
    } = req.body;

    if (!name || !script) {
      return res.status(400).json({ message: "Name and script are required" });
    }

    const synthetic = await SyntheticMonitor.create({
      userId: req.user._id,
      name: name.trim(),
      script,
      interval: interval !== undefined ? Number(interval) : 15,
      timeout: timeout !== undefined ? Number(timeout) : 30000,
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
      .json({ message: "Synthetic monitor created", synthetic });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unexpected server error", error: error.message });
  }
};

export const getSyntheticMonitors = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit) || 6;
    const query = { userId: req.user._id };

    if (!isNaN(page)) {
      const skip = (page - 1) * limit;
      const total = await SyntheticMonitor.countDocuments(query);
      const synthetics = await SyntheticMonitor.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.status(200).json({
        count: total,
        synthetics,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      const synthetics = await SyntheticMonitor.find(query).sort({
        createdAt: -1,
      });
      return res.status(200).json({ count: synthetics.length, synthetics });
    }
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Server error retrieving synthetic monitors",
        error: error.message,
      });
  }
};

export const getSyntheticMonitorById = async (req, res) => {
  try {
    const synthetic = await SyntheticMonitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!synthetic) {
      return res.status(404).json({ message: "Synthetic monitor not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const queryObj = { syntheticMonitorId: synthetic._id };
    if (req.query.status && req.query.status !== "all") {
      queryObj.status = req.query.status;
    }

    const totalRuns = await SyntheticRun.countDocuments(queryObj);
    const runs = await SyntheticRun.find(queryObj)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const allRecentRuns = await SyntheticRun.find({
      syntheticMonitorId: synthetic._id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    let totalLoadTime = 0;
    let successCount = 0;
    allRecentRuns.forEach((r) => {
      totalLoadTime += r.metrics?.loadTime || 0;
      if (r.status === "success") successCount++;
    });

    const stats = {
      avgLoadTime: allRecentRuns.length
        ? Math.round(totalLoadTime / allRecentRuns.length)
        : 0,
      successRate: allRecentRuns.length
        ? Math.round((successCount / allRecentRuns.length) * 100)
        : 100,
      totalRunsCount: totalRuns,
    };

    return res.status(200).json({
      synthetic,
      runs,
      stats,
      pagination: {
        total: totalRuns,
        page,
        limit,
        totalPages: Math.ceil(totalRuns / limit),
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Server error retrieving synthetic monitor details",
        error: error.message,
      });
  }
};

export const updateSyntheticMonitor = async (req, res) => {
  try {
    const {
      name,
      script,
      interval,
      timeout,
      alertChannels,
      webhookUrl,
      escalationEmails,
      alertCooldown,
      timezone,
      quietHours,
    } = req.body;

    const updateObj = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (script !== undefined) updateObj.script = script;
    if (interval !== undefined) updateObj.interval = Number(interval);
    if (timeout !== undefined) updateObj.timeout = Number(timeout);
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

    const synthetic = await SyntheticMonitor.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      updateObj,
      { returnDocument: 'after', runValidators: true },
    );

    if (!synthetic) {
      return res.status(404).json({ message: "Synthetic monitor not found" });
    }

    return res
      .status(200)
      .json({ message: "Synthetic monitor updated successfully", synthetic });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Server error updating synthetic monitor",
        error: error.message,
      });
  }
};

export const pauseToggleSyntheticMonitor = async (req, res) => {
  try {
    const synthetic = await SyntheticMonitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!synthetic) {
      return res.status(404).json({ message: "Synthetic monitor not found" });
    }

    synthetic.isActive = !synthetic.isActive;
    if (!synthetic.isActive) {
      synthetic.status = "unknown";
    }

    await synthetic.save();

    return res
      .status(200)
      .json({
        message: `Synthetic monitor ${synthetic.isActive ? "resumed" : "paused"} successfully`,
        synthetic,
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Server error toggling active status",
        error: error.message,
      });
  }
};

export const deleteSyntheticMonitor = async (req, res) => {
  try {
    const synthetic = await SyntheticMonitor.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!synthetic) {
      return res.status(404).json({ message: "Synthetic monitor not found" });
    }

    const runs = await SyntheticRun.find({ syntheticMonitorId: synthetic._id });

    const fs = await import("fs");
    const path = await import("path");

    for (const run of runs) {
      if (run.screenshotUrl) {
        const filePath = path.join(process.cwd(), run.screenshotUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      if (run.videoUrl) {
        const filePath = path.join(process.cwd(), run.videoUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await SyntheticRun.deleteMany({ syntheticMonitorId: synthetic._id });

    return res
      .status(200)
      .json({
        message:
          "Synthetic monitor and related history runs deleted successfully",
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Server error deleting synthetic monitor",
        error: error.message,
      });
  }
};

export const runSyntheticMonitorNow = async (req, res) => {
  try {
    const synthetic = await SyntheticMonitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!synthetic) {
      return res.status(404).json({ message: "Synthetic monitor not found" });
    }

    if (isRedisQueueEnabled()) {
      const queues = getQueues();
      await queues.synthetic.add(
        `synthetic-manual:${synthetic._id}:${Date.now()}`,
        { monitorId: synthetic._id },
        {
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
      return res
        .status(200)
        .json({ message: "Synthetic check execution successfully enqueued" });
    } else {
      console.log(`Executing inline synthetic run for: ${synthetic.name}`);
      const runLog = await processSyntheticCheck(synthetic._id);
      return res
        .status(200)
        .json({
          message: "Synthetic check execution successfully completed",
          run: runLog,
        });
    }
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Server error launching synthetic monitor check",
        error: error.message,
      });
  }
};

export const getSyntheticRunDetail = async (req, res) => {
  try {
    const run = await SyntheticRun.findById(req.params.runId);
    if (!run) {
      return res
        .status(404)
        .json({ message: "Synthetic execution run details not found" });
    }

    const monitor = await SyntheticMonitor.findOne({
      _id: run.syntheticMonitorId,
      userId: req.user._id,
    });

    if (!monitor) {
      return res
        .status(403)
        .json({
          message: "Access forbidden: you do not own this synthetic monitor",
        });
    }

    return res.status(200).json({ run });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Server error retrieving run detail",
        error: error.message,
      });
  }
};
