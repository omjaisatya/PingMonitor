import ApiCollection from "../models/ApiCollection.js";
import ApiMonitor from "../models/ApiMonitor.js";
import ApiRun from "../models/ApiRun.js";
import { encrypt } from "../utils/cryptoUtils.js";
import { isRedisQueueEnabled, getQueues } from "../services/queueService.js";
import { processApiCheck } from "../workers/apiWorker.js";

const processVariablesForSave = (incomingVars, existingVars = []) => {
  if (!incomingVars) return [];
  return incomingVars.map((v) => {
    if (v.isSecure) {
      if (v.value === "••••••••") {
        const match = existingVars.find((ex) => ex.key === v.key);
        return {
          key: v.key,
          value: match ? match.value : "",
          isSecure: true,
        };
      } else {
        return {
          key: v.key,
          value: encrypt(v.value),
          isSecure: true,
        };
      }
    } else {
      return {
        key: v.key,
        value: v.value,
        isSecure: false,
      };
    }
  });
};

const processHeadersForSave = (incomingHeaders, existingHeaders = []) => {
  if (!incomingHeaders) return [];
  return incomingHeaders.map((h) => {
    if (h.isSecure) {
      if (h.value === "••••••••") {
        const match = existingHeaders.find((ex) => ex.key === h.key);
        return {
          key: h.key,
          value: match ? match.value : "",
          isSecure: true,
        };
      } else {
        return {
          key: h.key,
          value: encrypt(h.value),
          isSecure: true,
        };
      }
    } else {
      return {
        key: h.key,
        value: h.value,
        isSecure: false,
      };
    }
  });
};

const maskCollectionDetails = (collection) => {
  if (!collection) return null;
  const colObj = collection.toObject();
  if (colObj.variables) {
    colObj.variables = colObj.variables.map((v) => ({
      ...v,
      value: v.isSecure ? "••••••••" : v.value,
    }));
  }
  return colObj;
};

const maskMonitorDetails = (monitor) => {
  if (!monitor) return null;
  const monObj = monitor.toObject();
  if (monObj.headers) {
    monObj.headers = monObj.headers.map((h) => ({
      ...h,
      value: h.isSecure ? "••••••••" : h.value,
    }));
  }
  return monObj;
};

export const createApiCollection = async (req, res) => {
  try {
    const { name, description, variables } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Collection name is required" });
    }

    const processedVars = processVariablesForSave(variables);

    const collection = await ApiCollection.create({
      userId: req.user._id,
      name: name.trim(),
      description: description || "",
      variables: processedVars,
    });

    return res.status(201).json({
      message: "Collection created successfully",
      collection: maskCollectionDetails(collection),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error creating collection",
      error: error.message,
    });
  }
};

export const getApiCollections = async (req, res) => {
  try {
    const collections = await ApiCollection.find({ userId: req.user._id }).sort(
      { createdAt: -1 },
    );
    const masked = collections.map(maskCollectionDetails);
    return res.status(200).json({ collections: masked });
  } catch (error) {
    return res.status(500).json({
      message: "Server error fetching collections",
      error: error.message,
    });
  }
};

export const updateApiCollection = async (req, res) => {
  try {
    const { name, description, variables } = req.body;
    const existing = await ApiCollection.findOne({
      _id: req.params.collectionId,
      userId: req.user._id,
    });

    if (!existing) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (name !== undefined) existing.name = name.trim();
    if (description !== undefined) existing.description = description;
    if (variables !== undefined) {
      existing.variables = processVariablesForSave(
        variables,
        existing.variables,
      );
    }

    await existing.save();
    return res.status(200).json({
      message: "Collection updated successfully",
      collection: maskCollectionDetails(existing),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error updating collection",
      error: error.message,
    });
  }
};

export const deleteApiCollection = async (req, res) => {
  try {
    const collection = await ApiCollection.findOneAndDelete({
      _id: req.params.collectionId,
      userId: req.user._id,
    });
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    await ApiMonitor.updateMany(
      { collectionId: collection._id },
      { collectionId: null },
    );

    return res.status(200).json({ message: "Collection deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Server error deleting collection",
      error: error.message,
    });
  }
};

export const createApiMonitor = async (req, res) => {
  try {
    const {
      name,
      url,
      method,
      collectionId,
      headers,
      body,
      assertions,
      interval,
      alertChannels,
      webhookUrl,
      escalationEmails,
      alertCooldown,
      timezone,
      quietHours,
    } = req.body;

    if (!name || !url) {
      return res.status(400).json({ message: "Name and URL are required" });
    }

    const processedHeaders = processHeadersForSave(headers);

    const monitor = await ApiMonitor.create({
      userId: req.user._id,
      collectionId: collectionId || null,
      name: name.trim(),
      url: url.trim(),
      method: method || "GET",
      headers: processedHeaders,
      body: body || "",
      assertions: assertions || [],
      interval: interval !== undefined ? Number(interval) : 10,
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

    return res.status(201).json({
      message: "API monitor created successfully",
      monitor: maskMonitorDetails(monitor),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error creating API monitor",
      error: error.message,
    });
  }
};

export const getApiMonitors = async (req, res) => {
  try {
    const query = { userId: req.user._id };
    if (req.query.collectionId) {
      query.collectionId =
        req.query.collectionId === "null" ? null : req.query.collectionId;
    }

    const monitors = await ApiMonitor.find(query).sort({ createdAt: -1 });
    const masked = monitors.map(maskMonitorDetails);
    return res.status(200).json({ monitors: masked });
  } catch (error) {
    return res.status(500).json({
      message: "Server error retrieving API monitors",
      error: error.message,
    });
  }
};

export const getApiMonitorById = async (req, res) => {
  try {
    const monitor = await ApiMonitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!monitor) {
      return res.status(404).json({ message: "API monitor not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const runsQuery = { apiMonitorId: monitor._id };
    const totalRuns = await ApiRun.countDocuments(runsQuery);
    const runs = await ApiRun.find(runsQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const allRecentRuns = await ApiRun.find({ apiMonitorId: monitor._id })
      .sort({ createdAt: -1 })
      .limit(50);

    let totalResponseTime = 0;
    let successCount = 0;
    allRecentRuns.forEach((r) => {
      totalResponseTime += r.response?.responseTime || 0;
      if (r.status === "success") successCount++;
    });

    const stats = {
      avgResponseTime: allRecentRuns.length
        ? Math.round(totalResponseTime / allRecentRuns.length)
        : 0,
      successRate: allRecentRuns.length
        ? Math.round((successCount / allRecentRuns.length) * 100)
        : 100,
      totalRunsCount: totalRuns,
    };

    return res.status(200).json({
      monitor: maskMonitorDetails(monitor),
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
    return res.status(500).json({
      message: "Server error fetching API monitor detail",
      error: error.message,
    });
  }
};

export const updateApiMonitor = async (req, res) => {
  try {
    const {
      name,
      url,
      method,
      collectionId,
      headers,
      body,
      assertions,
      interval,
      alertChannels,
      webhookUrl,
      escalationEmails,
      alertCooldown,
      timezone,
      quietHours,
    } = req.body;

    const existing = await ApiMonitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!existing) {
      return res.status(404).json({ message: "API monitor not found" });
    }

    if (name !== undefined) existing.name = name.trim();
    if (url !== undefined) existing.url = url.trim();
    if (method !== undefined) existing.method = method;
    if (collectionId !== undefined)
      existing.collectionId = collectionId || null;
    if (body !== undefined) existing.body = body;
    if (assertions !== undefined) existing.assertions = assertions;
    if (interval !== undefined) existing.interval = Number(interval);
    if (webhookUrl !== undefined) existing.webhookUrl = webhookUrl;
    if (escalationEmails !== undefined)
      existing.escalationEmails = escalationEmails;
    if (alertCooldown !== undefined)
      existing.alertCooldown = Number(alertCooldown);
    if (timezone !== undefined) existing.timezone = timezone;

    if (headers !== undefined) {
      existing.headers = processHeadersForSave(headers, existing.headers);
    }

    if (alertChannels !== undefined) {
      existing.alertChannels = {
        email: alertChannels.email ?? true,
        webhook: alertChannels.webhook ?? false,
        inApp: alertChannels.inApp ?? true,
      };
    }

    if (quietHours !== undefined) {
      existing.quietHours = {
        enabled: quietHours.enabled ?? false,
        start: quietHours.start || "22:00",
        end: quietHours.end || "08:00",
      };
    }

    await existing.save();
    return res.status(200).json({
      message: "API monitor updated successfully",
      monitor: maskMonitorDetails(existing),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error updating API monitor",
      error: error.message,
    });
  }
};

export const pauseToggleApiMonitor = async (req, res) => {
  try {
    const monitor = await ApiMonitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!monitor) {
      return res.status(404).json({ message: "API monitor not found" });
    }

    monitor.isActive = !monitor.isActive;
    if (!monitor.isActive) {
      monitor.status = "unknown";
    }

    await monitor.save();
    return res.status(200).json({
      message: `API monitor ${monitor.isActive ? "resumed" : "paused"} successfully`,
      monitor: maskMonitorDetails(monitor),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error toggling active status",
      error: error.message,
    });
  }
};

export const deleteApiMonitor = async (req, res) => {
  try {
    const monitor = await ApiMonitor.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!monitor) {
      return res.status(404).json({ message: "API monitor not found" });
    }

    await ApiRun.deleteMany({ apiMonitorId: monitor._id });

    return res.status(200).json({
      message: "API monitor and execution run logs deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error deleting API monitor",
      error: error.message,
    });
  }
};

export const runApiMonitorNow = async (req, res) => {
  try {
    const monitor = await ApiMonitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!monitor) {
      return res.status(404).json({ message: "API monitor not found" });
    }

    if (isRedisQueueEnabled()) {
      const queues = getQueues();
      await queues.api.add(
        `api-manual:${monitor._id}:${Date.now()}`,
        { monitorId: monitor._id },
        {
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
      return res
        .status(200)
        .json({ message: "API check execution enqueued successfully" });
    } else {
      console.log(`Executing inline API monitor run for: ${monitor.name}`);
      const runLog = await processApiCheck(monitor._id);
      return res
        .status(200)
        .json({ message: "API check completed", run: runLog });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Server error running API check",
      error: error.message,
    });
  }
};

export const getApiRunDetail = async (req, res) => {
  try {
    const run = await ApiRun.findById(req.params.runId);
    if (!run) {
      return res.status(404).json({ message: "Run log not found" });
    }

    const monitor = await ApiMonitor.findOne({
      _id: run.apiMonitorId,
      userId: req.user._id,
    });
    if (!monitor) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not own this API monitor" });
    }

    const previousRun = await ApiRun.findOne({
      apiMonitorId: run.apiMonitorId,
      createdAt: { $lt: run.createdAt },
      status: "success",
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      run,
      previousResponseBody: previousRun?.response?.body || "",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error fetching run details",
      error: error.message,
    });
  }
};
