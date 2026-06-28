import crypto from "crypto";
import Log from "../models/Log.js";
import Monitor from "../models/Monitor.js";
import RegionalCheckResult from "../models/RegionalCheckResult.js";
import {
  DEFAULT_MONITOR_REGIONS,
  getMajorityThreshold,
  getMonitorRegions,
} from "../config/regions.js";
import { MONITOR_NODE_REGION } from "../config/env.config.js";
import {
  calculateDowntime,
  dispatchNotifications,
  updateDailyStats,
} from "./monitorNotificationService.js";
import {
  handleMonitorFailureIncident,
  handleMonitorRecoveryIncident,
} from "./incidentService.js";
import { emitIncidentEvent } from "./realtimeService.js";

export const createCheckGroupId = (monitorId) =>
  `${monitorId}:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`;

const averageLatency = (results) => {
  const latencies = results
    .map((result) => result.responseTime)
    .filter((value) => value !== null && value !== undefined);

  if (latencies.length === 0) return null;
  return Math.round(
    latencies.reduce((sum, value) => sum + value, 0) / latencies.length,
  );
};

const toRegionalStatusMap = (results) => {
  const regionalStatus = {};
  for (const result of results) {
    regionalStatus[result.region] = {
      status: result.status,
      responseTime: result.responseTime,
      statusCode: result.statusCode,
      checkedAt: result.checkedAt,
      error: result.error || "",
    };
  }
  return regionalStatus;
};

export const storeRegionalResult = async (payload) => {
  const result = await RegionalCheckResult.findOneAndUpdate(
    {
      checkGroupId: payload.checkGroupId,
      region: payload.region,
    },
    {
      monitorId: payload.monitorId,
      status: payload.status,
      statusCode: payload.statusCode,
      responseTime: payload.responseTime,
      error: payload.error || "",
      checkedAt: payload.checkedAt ? new Date(payload.checkedAt) : new Date(),
      workerId: payload.workerId || "",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return result;
};

export const aggregateRegionalCheck = async (checkGroupId) => {
  const alreadyAggregated = await Log.exists({ checkGroupId, region: "quorum" });
  if (alreadyAggregated) return null;

  const results = await RegionalCheckResult.find({ checkGroupId }).sort({
    region: 1,
  });

  if (results.length === 0) return null;

  const monitor = await Monitor.findById(results[0].monitorId);
  if (!monitor) return null;

  const regions = getMonitorRegions();
  const majorityNeeded = getMajorityThreshold(regions);
  const failedRegions = results.filter((result) => result.status === "down");
  const quorumStatus =
    failedRegions.length >= majorityNeeded ? "down" : "up";
  const previousStatus = monitor.status;
  const avgResponseTime = averageLatency(results);
  const representativeResult = results.find((result) => result.status === quorumStatus);
  const representativeStatusCode = representativeResult !== undefined
    ? representativeResult.statusCode
    : (results[0] ? results[0].statusCode : null);

  const quorum = {
    passed: quorumStatus === "up",
    totalRegions: regions.length,
    failedRegions: failedRegions.length,
    majorityNeeded,
  };

  await Log.create({
    monitorId: monitor._id,
    status: quorumStatus,
    statusCode: representativeStatusCode,
    responseTime: avgResponseTime,
    region: "quorum",
    checkGroupId,
    timestamp: results[0]?.checkedAt || new Date(),
    quorum,
  });

  for (const result of results) {
    await Log.create({
      monitorId: monitor._id,
      status: result.status,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      region: result.region,
      checkGroupId,
      timestamp: result.checkedAt,
      quorum,
    });
  }

  const updatePayload = {
    status: quorumStatus,
    regionalStatus: toRegionalStatusMap(results),
    lastQuorum: {
      checkGroupId,
      totalRegions: regions.length,
      failedRegions: failedRegions.length,
      majorityNeeded,
      passed: quorumStatus === "up",
      evaluatedAt: new Date(),
    },
  };

  if (quorumStatus === "up") {
    updatePayload.consecutiveFailures = 0;

    if (previousStatus === "down") {
      const downtimeSec = await calculateDowntime(monitor._id);
      if (monitor.notifyOnRecovery ?? true) {
        const message = `Monitor ${monitor.name} is back UP by regional quorum (${regions.length - failedRegions.length}/${regions.length} regions healthy)`;
        await dispatchNotifications(
          monitor,
          "recovered",
          representativeStatusCode,
          avgResponseTime,
          message,
          downtimeSec,
        );
      }
      await handleMonitorRecoveryIncident({
        monitor,
        statusCode: representativeStatusCode,
        responseTime: avgResponseTime,
        downtimeSec,
      });
      updatePayload.firstRecoveredAt = null;
    } else if (avgResponseTime > (monitor.latencyThreshold || 2000)) {
      const message = `Monitor ${monitor.name} is SLOW by regional quorum. Average latency: ${avgResponseTime}ms`;
      await dispatchNotifications(
        monitor,
        "slow",
        representativeStatusCode,
        avgResponseTime,
        message,
      );
    }
  } else {
    updatePayload.consecutiveFailures = (monitor.consecutiveFailures || 0) + 1;
    updatePayload.firstRecoveredAt = null;

    if (updatePayload.consecutiveFailures >= (monitor.retryLimit || 1)) {
      const failedNames = failedRegions
        .map((result) => result.region.toUpperCase())
        .join(", ");
      const message = `Monitor ${monitor.name} is DOWN by regional quorum. Failed regions: ${failedNames}`;
      await dispatchNotifications(
        monitor,
        "down",
        representativeStatusCode,
        avgResponseTime,
        message,
      );
      await handleMonitorFailureIncident({
        monitor: { ...monitor.toObject(), consecutiveFailures: updatePayload.consecutiveFailures },
        statusCode: representativeStatusCode,
        responseTime: avgResponseTime,
        failureCount: updatePayload.consecutiveFailures,
      });
    }
  }

  await Monitor.findByIdAndUpdate(monitor._id, updatePayload);
  await updateDailyStats(
    monitor._id,
    quorumStatus,
    avgResponseTime,
    representativeStatusCode,
    previousStatus,
  );

  try {
    emitIncidentEvent(monitor.userId, "monitor:updated", {
      monitorId: monitor._id.toString(),
      status: quorumStatus,
      responseTime: avgResponseTime,
      lastQuorum: updatePayload.lastQuorum,
      regionalStatus: updatePayload.regionalStatus,
    });
    emitIncidentEvent(monitor.userId, "check:completed", {
      monitorId: monitor._id.toString(),
      status: quorumStatus,
      responseTime: avgResponseTime,
      checkGroupId,
    });
  } catch (err) {
    console.error("Failed to emit WebSocket events:", err);
  }

  return {
    checkGroupId,
    status: quorumStatus,
    totalRegions: regions.length,
    failedRegions: failedRegions.length,
    majorityNeeded,
    averageResponseTime: avgResponseTime,
  };
};

export const getRegionalBreakdown = async (monitorId) => {
  const regions = getMonitorRegions();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let recentResults = await RegionalCheckResult.find({ monitorId })
    .sort({ checkedAt: -1 })
    .limit(regions.length * 60);

  if (recentResults.length === 0) {
    const fallbackRegion = DEFAULT_MONITOR_REGIONS.includes(
      (MONITOR_NODE_REGION || "").toLowerCase(),
    )
      ? MONITOR_NODE_REGION.toLowerCase()
      : regions[0];

    const localLogs = await Log.find({
      monitorId,
      region: { $in: ["central", "quorum"] },
    })
      .sort({ timestamp: -1 })
      .limit(60);

    recentResults = localLogs.map((log) => ({
      region: fallbackRegion,
      status: log.status,
      responseTime: log.responseTime,
      statusCode: log.statusCode,
      checkedAt: log.timestamp,
      error: "",
    }));
  }

  return regions.map((region) => {
    const regionResults = recentResults.filter(
      (result) => result.region === region,
    );
    const latest = regionResults[0] || null;
    const last24h = regionResults.filter(
      (result) => new Date(result.checkedAt) >= since,
    );
    const failures = last24h.filter((result) => result.status === "down");
    const latencies = last24h
      .map((result) => result.responseTime)
      .filter((value) => value !== null && value !== undefined);

    return {
      region,
      latest: latest
        ? {
            status: latest.status,
            responseTime: latest.responseTime,
            statusCode: latest.statusCode,
            checkedAt: latest.checkedAt,
            error: latest.error,
          }
        : null,
      checks24h: last24h.length,
      failures24h: failures.length,
      averageLatency24h:
        latencies.length > 0
          ? Math.round(
              latencies.reduce((sum, value) => sum + value, 0) /
                latencies.length,
            )
          : null,
      heatmap: regionResults.slice(0, 24).reverse().map((result) => ({
        checkedAt: result.checkedAt,
        status: result.status,
        responseTime: result.responseTime,
      })),
    };
  });
};
