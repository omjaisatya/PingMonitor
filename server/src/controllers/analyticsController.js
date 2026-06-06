import Monitor from "../models/Monitor.js";
import MonitorStats from "../models/MonitorStats.js";
import AlertLog from "../models/AlertLog.js";
import EmailLog from "../models/EmailLog.js";
import Log from "../models/Log.js";
import mongoose from "mongoose";

const parseDateRange = (range, startDateStr, endDateStr) => {
  const end = new Date();
  let start = new Date();

  if (range === "30d") {
    start.setDate(end.getDate() - 30);
    start.setUTCHours(0, 0, 0, 0);
  } else if (range === "custom" && startDateStr && endDateStr) {
    start = new Date(startDateStr);
    start.setUTCHours(0, 0, 0, 0);
    end.setTime(new Date(endDateStr).getTime());
    end.setUTCHours(23, 59, 59, 999);
  } else {
    start.setDate(end.getDate() - 7);
    start.setUTCHours(0, 0, 0, 0);
  }

  return { start, end };
};

export const getOverview = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const monitors = await Monitor.find({ userId });
    const totalMonitors = monitors.length;
    const activeAlerts = monitors.filter((m) => m.status === "down").length;
    const monitorIds = monitors.map((m) => m._id);

    const emailAgg = await EmailLog.aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const emailStats = { sent: 0, failed: 0, bounced: 0 };
    emailAgg.forEach((item) => {
      if (emailStats[item._id] !== undefined) {
        emailStats[item._id] = item.count;
      }
    });

    const recentAlerts = await AlertLog.find({ monitorId: { $in: monitorIds } })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("monitorId", "name url");

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    last30Days.setUTCHours(0, 0, 0, 0);

    const globalAgg = await MonitorStats.aggregate([
      {
        $match: { monitorId: { $in: monitorIds }, date: { $gte: last30Days } },
      },
      {
        $group: {
          _id: null,
          totalPings: { $sum: "$pingCount" },
          totalUp: { $sum: "$upCount" },
          responseTimeSum: { $sum: "$responseTimeSum" },
          responseTimeCount: { $sum: "$responseTimeCount" },
        },
      },
    ]);

    let avgResponseTime = 0;
    let overallUptime = 100;

    if (globalAgg.length > 0) {
      const data = globalAgg[0];
      if (data.responseTimeCount > 0) {
        avgResponseTime = Math.round(
          data.responseTimeSum / data.responseTimeCount,
        );
      }
      if (data.totalPings > 0) {
        overallUptime = parseFloat(
          ((data.totalUp / data.totalPings) * 100).toFixed(2),
        );
      }
    } else {
      const logsAgg = await Log.aggregate([
        {
          $match: {
            monitorId: { $in: monitorIds },
            timestamp: { $gte: last30Days },
          },
        },
        {
          $group: {
            _id: null,
            totalPings: { $sum: 1 },
            totalUp: { $sum: { $cond: [{ $eq: ["$status", "up"] }, 1, 0] } },
            responseTimeSum: { $sum: "$responseTime" },
            responseTimeCount: {
              $sum: { $cond: [{ $ne: ["$responseTime", null] }, 1, 0] },
            },
          },
        },
      ]);
      if (logsAgg.length > 0) {
        const data = logsAgg[0];
        if (data.responseTimeCount > 0) {
          avgResponseTime = Math.round(
            data.responseTimeSum / data.responseTimeCount,
          );
        }
        if (data.totalPings > 0) {
          overallUptime = parseFloat(
            ((data.totalUp / data.totalPings) * 100).toFixed(2),
          );
        }
      }
    }

    res.json({
      totalMonitors,
      activeAlerts,
      emailStats,
      recentAlerts,
      avgResponseTime,
      overallUptime,
    });
  } catch (error) {
    next(error);
  }
};

export const getMonitorAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { range, startDate, endDate } = req.query;

    const monitor = await Monitor.findOne({ _id: id, userId: req.user._id });
    if (!monitor) {
      return res
        .status(404)
        .json({ message: "Monitor not found or unauthorized" });
    }

    const { start, end } = parseDateRange(range, startDate, endDate);

    const stats = await MonitorStats.find({
      monitorId: id,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    let totalPings = 0;
    let totalUp = 0;
    let totalDown = 0;
    let totalResponseTimeSum = 0;
    let totalResponseTimeCount = 0;
    let downtimeDuration = 0;
    let downtimeFrequency = 0;
    const statusCodesMap = {};

    stats.forEach((s) => {
      totalPings += s.pingCount;
      totalUp += s.upCount;
      totalDown += s.downCount;
      totalResponseTimeSum += s.responseTimeSum;
      totalResponseTimeCount += s.responseTimeCount;
      downtimeDuration += s.downtimeDuration;
      downtimeFrequency += s.downtimeFrequency;

      if (s.statusCodes) {
        for (const [code, count] of s.statusCodes.entries()) {
          statusCodesMap[code] = (statusCodesMap[code] || 0) + count;
        }
      }
    });

    const trends = stats.map((s) => {
      const avg =
        s.responseTimeCount > 0
          ? Math.round(s.responseTimeSum / s.responseTimeCount)
          : 0;
      return {
        date: s.date.toISOString().split("T")[0],
        responseTime: avg,
      };
    });

    const statusCodes = Object.entries(statusCodesMap)
      .map(([code, count]) => ({
        code,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Daily (Last 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs24h = await Log.find({
      monitorId: id,
      timestamp: { $gte: last24h },
    });
    const upLogs24h = logs24h.filter((l) => l.status === "up").length;
    const uptimeDaily =
      logs24h.length > 0
        ? parseFloat(((upLogs24h / logs24h.length) * 100).toFixed(2))
        : 100;

    // Weekly
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const statsWeekly = await MonitorStats.find({
      monitorId: id,
      date: { $gte: sevenDaysAgo },
    });
    const sumPingsW = statsWeekly.reduce((acc, s) => acc + s.pingCount, 0);
    const sumUpW = statsWeekly.reduce((acc, s) => acc + s.upCount, 0);
    const uptimeWeekly =
      sumPingsW > 0 ? parseFloat(((sumUpW / sumPingsW) * 100).toFixed(2)) : 100;

    // Monthly
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const statsMonthly = await MonitorStats.find({
      monitorId: id,
      date: { $gte: thirtyDaysAgo },
    });
    const sumPingsM = statsMonthly.reduce((acc, s) => acc + s.pingCount, 0);
    const sumUpM = statsMonthly.reduce((acc, s) => acc + s.upCount, 0);
    const uptimeMonthly =
      sumPingsM > 0 ? parseFloat(((sumUpM / sumPingsM) * 100).toFixed(2)) : 100;

    // Yearly
    const yearAgo = new Date();
    yearAgo.setDate(yearAgo.getDate() - 365);
    const statsYearly = await MonitorStats.find({
      monitorId: id,
      date: { $gte: yearAgo },
    });
    const sumPingsY = statsYearly.reduce((acc, s) => acc + s.pingCount, 0);
    const sumUpY = statsYearly.reduce((acc, s) => acc + s.upCount, 0);
    const uptimeYearly =
      sumPingsY > 0 ? parseFloat(((sumUpY / sumPingsY) * 100).toFixed(2)) : 100;

    const peakHoursAgg = await Log.aggregate([
      {
        $match: {
          monitorId: new mongoose.Types.ObjectId(id),
          timestamp: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $hour: "$timestamp" },
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const peakHours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      responseTime: 0,
    }));

    peakHoursAgg.forEach((item) => {
      if (item._id >= 0 && item._id < 24) {
        peakHours[item._id].responseTime = Math.round(
          item.avgResponseTime || 0,
        );
      }
    });

    const averageResponseTime =
      totalResponseTimeCount > 0
        ? Math.round(totalResponseTimeSum / totalResponseTimeCount)
        : 0;
    const uptimePercentage =
      totalPings > 0
        ? parseFloat(((totalUp / totalPings) * 100).toFixed(2))
        : 100;

    res.json({
      monitor,
      range,
      uptimePercentage,
      averageResponseTime,
      downtimeDuration,
      downtimeFrequency,
      trends,
      statusCodes,
      uptimes: {
        daily: uptimeDaily,
        weekly: uptimeWeekly,
        monthly: uptimeMonthly,
        yearly: uptimeYearly,
      },
      peakHours,
    });
  } catch (error) {
    next(error);
  }
};

export const getAlertsHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const monitorId = req.query.monitorId;

    let query = {};
    if (monitorId) {
      query.monitorId = monitorId;
    } else {
      const monitors = await Monitor.find({ userId: req.user._id });
      const monitorIds = monitors.map((m) => m._id);
      query.monitorId = { $in: monitorIds };
    }

    const total = await AlertLog.countDocuments(query);
    const logs = await AlertLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("monitorId", "name url");

    res.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEmailsHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    let query = { userId: req.user._id };
    if (status) {
      query.status = status;
    }

    const total = await EmailLog.countDocuments(query);
    const logs = await EmailLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("monitorId", "name url");

    res.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
