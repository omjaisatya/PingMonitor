import Monitor from "../models/Monitor.js";
import MonitorStats from "../models/MonitorStats.js";
import AlertLog from "../models/AlertLog.js";
import EmailLog from "../models/EmailLog.js";
import Log from "../models/Log.js";
import mongoose from "mongoose";
import { chromium } from "playwright";

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
            region: { $in: ["quorum", "central"] },
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
      region: { $in: ["quorum", "central"] },
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
          region: { $in: ["quorum", "central"] },
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

const convertToCSV = (headers, rows) => {
  const formatCell = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(formatCell).join(",");
  const rowLines = rows.map((row) => row.map(formatCell).join(","));
  return [headerLine, ...rowLines].join("\n");
};

export const exportAlertsHistory = async (req, res, next) => {
  try {
    const monitorId = req.query.monitorId;

    let query = {};
    if (monitorId) {
      query.monitorId = monitorId;
    } else {
      const monitors = await Monitor.find({ userId: req.user._id });
      const monitorIds = monitors.map((m) => m._id);
      query.monitorId = { $in: monitorIds };
    }

    const logs = await AlertLog.find(query)
      .sort({ timestamp: -1 })
      .populate("monitorId", "name url");

    const headers = [
      "Monitor Name",
      "URL",
      "Status",
      "HTTP Code",
      "Response Time (ms)",
      "Message",
      "Timestamp",
    ];

    const rows = logs.map((l) => [
      l.monitorId?.name || "Deleted Monitor",
      l.monitorId?.url || "N/A",
      l.status.toUpperCase(),
      l.statusCode ?? "—",
      l.responseTime ? `${l.responseTime}ms` : "—",
      l.message || "",
      l.timestamp ? l.timestamp.toISOString() : "",
    ]);

    const csvContent = convertToCSV(headers, rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="alerts_history_report.csv"',
    );
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const exportEmailsHistory = async (req, res, next) => {
  try {
    const status = req.query.status;

    let query = { userId: req.user._id };
    if (status) {
      query.status = status;
    }

    const logs = await EmailLog.find(query)
      .sort({ timestamp: -1 })
      .populate("monitorId", "name url");

    const headers = [
      "Recipient",
      "Subject",
      "Status",
      "Failure Reason",
      "Retry Status",
      "Attempts",
      "Sent At",
    ];

    const rows = logs.map((l) => [
      l.email,
      l.subject,
      l.status,
      l.errorReason || "—",
      l.retryStatus || "—",
      l.attempts ?? 0,
      l.timestamp ? l.timestamp.toISOString() : "",
    ]);

    const csvContent = convertToCSV(headers, rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="emails_history_report.csv"',
    );
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const exportMonitorTrends = async (req, res, next) => {
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

    const headers = [
      "Date",
      "Average Response Time (ms)",
      "Total Pings",
      "Up Count",
      "Down Count",
      "Downtime Duration (s)",
      "Downtime Frequency",
    ];

    const rows = stats.map((s) => {
      const avg =
        s.responseTimeCount > 0
          ? Math.round(s.responseTimeSum / s.responseTimeCount)
          : 0;
      return [
        s.date.toISOString().split("T")[0],
        avg,
        s.pingCount,
        s.upCount,
        s.downCount,
        s.downtimeDuration,
        s.downtimeFrequency,
      ];
    });

    const csvContent = convertToCSV(headers, rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${monitor.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_trends_report.csv"`,
    );
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const exportPDFReport = async (req, res, next) => {
  let browser;
  try {
    const monitorId = req.query.monitorId;
    let htmlContent = "";
    let filename = "";

    if (monitorId) {
      const monitor = await Monitor.findOne({
        _id: monitorId,
        userId: req.user._id,
      });
      if (!monitor) {
        return res
          .status(404)
          .json({ message: "Monitor not found or unauthorized" });
      }

      filename = `${monitor.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_report.pdf`;

      const stats = await MonitorStats.find({
        monitorId,
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }).sort({ date: -1 });

      let totalPings = 0;
      let totalUp = 0;
      let totalResponseTimeSum = 0;
      let totalResponseTimeCount = 0;
      let downtimeDuration = 0;
      let downtimeFrequency = 0;

      stats.forEach((s) => {
        totalPings += s.pingCount;
        totalUp += s.upCount;
        totalResponseTimeSum += s.responseTimeSum;
        totalResponseTimeCount += s.responseTimeCount;
        downtimeDuration += s.downtimeDuration;
        downtimeFrequency += s.downtimeFrequency;
      });

      const avgResponse =
        totalResponseTimeCount > 0
          ? Math.round(totalResponseTimeSum / totalResponseTimeCount)
          : 0;
      const uptime =
        totalPings > 0
          ? parseFloat(((totalUp / totalPings) * 100).toFixed(2))
          : 100;

      const alerts = await AlertLog.find({ monitorId })
        .sort({ timestamp: -1 })
        .limit(10);

      const trends = stats.slice(0, 15).map((s) => {
        const avg =
          s.responseTimeCount > 0
            ? Math.round(s.responseTimeSum / s.responseTimeCount)
            : 0;
        return {
          date: s.date.toISOString().split("T")[0],
          responseTime: avg,
          uptime:
            s.pingCount > 0
              ? ((s.upCount / s.pingCount) * 100).toFixed(1) + "%"
              : "100%",
        };
      });

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Monitor Report: ${monitor.name}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; background-color: #f8fafc; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 30px; }
    .title { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 5px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 35px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
    .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 5px; font-weight: 600; letter-spacing: 0.5px; }
    .card-value { font-size: 20px; font-weight: bold; color: #0f172a; }
    .val-green { color: #10b981; }
    .val-red { color: #ef4444; }
    .section-title { font-size: 16px; font-weight: 600; color: #1e293b; margin-top: 30px; margin-bottom: 12px; border-left: 4px solid #3b82f6; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    th { background-color: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 12px; font-size: 12px; color: #334155; border-bottom: 1px solid #f1f5f9; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .badge-up { background-color: #d1fae5; color: #065f46; }
    .badge-down { background-color: #fee2e2; color: #991b1b; }
    .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Monitor Performance Report</div>
    <div class="subtitle">Detailed analysis for <strong>${monitor.name}</strong> (${monitor.url}) · Generated on ${new Date().toLocaleString()}</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Current Status</div>
      <div class="card-value ${monitor.status === "up" ? "val-green" : "val-red"}">${monitor.status.toUpperCase()}</div>
    </div>
    <div class="card">
      <div class="card-label">Uptime (30 Days)</div>
      <div class="card-value val-green">${uptime}%</div>
    </div>
    <div class="card">
      <div class="card-label">Avg Response Time</div>
      <div class="card-value">${avgResponse}ms</div>
    </div>
    <div class="card">
      <div class="card-label">Total Downtime Incidents</div>
      <div class="card-value val-red">${downtimeFrequency}</div>
    </div>
  </div>

  <div class="section-title">Daily Performance Trends (Last 15 Records)</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Avg Response Time (ms)</th>
        <th>Uptime Percentage</th>
      </tr>
    </thead>
    <tbody>
      ${
        trends.length === 0
          ? "<tr><td colspan='3' style='text-align:center;'>No historical stats recorded.</td></tr>"
          : trends
              .map(
                (t) => `
        <tr>
          <td>${t.date}</td>
          <td>${t.responseTime}ms</td>
          <td>${t.uptime}</td>
        </tr>
      `,
              )
              .join("")
      }
    </tbody>
  </table>

  <div class="section-title">Recent Status Changes & Incident Logs (Last 10 Changes)</div>
  <table>
    <thead>
      <tr>
        <th>Status</th>
        <th>HTTP Code</th>
        <th>Response Time</th>
        <th>Message</th>
        <th>Detected At</th>
      </tr>
    </thead>
    <tbody>
      ${
        alerts.length === 0
          ? "<tr><td colspan='5' style='text-align:center;'>No alert logs found.</td></tr>"
          : alerts
              .map(
                (a) => `
        <tr>
          <td><span class="badge ${a.status === "up" ? "badge-up" : "badge-down"}">${a.status}</span></td>
          <td>${a.statusCode ?? "—"}</td>
          <td>${a.responseTime ? a.responseTime + "ms" : "—"}</td>
          <td>${a.message || "—"}</td>
          <td>${a.timestamp ? new Date(a.timestamp).toLocaleString() : "—"}</td>
        </tr>
      `,
              )
              .join("")
      }
    </tbody>
  </table>

  <div class="footer">
    Report automatically generated by PingMonitor System. Custom backup exported under User Authentication.
  </div>
</body>
</html>
      `;
    } else {
      filename = "global_system_report.pdf";
      const monitors = await Monitor.find({ userId: req.user._id });
      const totalMonitors = monitors.length;
      const activeAlerts = monitors.filter((m) => m.status === "down").length;
      const monitorIds = monitors.map((m) => m._id);

      const globalAgg = await MonitorStats.aggregate([
        {
          $match: {
            monitorId: { $in: monitorIds },
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
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
      }

      const recentAlerts = await AlertLog.find({
        monitorId: { $in: monitorIds },
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .populate("monitorId", "name url");

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Global System Status Report</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; background-color: #f8fafc; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 30px; }
    .title { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 5px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 35px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
    .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 5px; font-weight: 600; letter-spacing: 0.5px; }
    .card-value { font-size: 20px; font-weight: bold; color: #0f172a; }
    .val-green { color: #10b981; }
    .val-red { color: #ef4444; }
    .section-title { font-size: 16px; font-weight: 600; color: #1e293b; margin-top: 30px; margin-bottom: 12px; border-left: 4px solid #3b82f6; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    th { background-color: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 12px; font-size: 12px; color: #334155; border-bottom: 1px solid #f1f5f9; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .badge-up { background-color: #d1fae5; color: #065f46; }
    .badge-down { background-color: #fee2e2; color: #991b1b; }
    .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Global System Status Report</div>
    <div class="subtitle">Overall account metrics summary · Generated on ${new Date().toLocaleString()}</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Total Monitors</div>
      <div class="card-value">${totalMonitors}</div>
    </div>
    <div class="card">
      <div class="card-label">Active Outages</div>
      <div class="card-value ${activeAlerts > 0 ? "val-red" : "val-green"}">${activeAlerts}</div>
    </div>
    <div class="card">
      <div class="card-label">System Uptime (30d)</div>
      <div class="card-value val-green">${overallUptime}%</div>
    </div>
    <div class="card">
      <div class="card-label">Global Avg Response Time</div>
      <div class="card-value">${avgResponseTime}ms</div>
    </div>
  </div>

  <div class="section-title">Active Monitor List & Details</div>
  <table>
    <thead>
      <tr>
        <th>Monitor Name</th>
        <th>URL</th>
        <th>Status</th>
        <th>Interval</th>
      </tr>
    </thead>
    <tbody>
      ${
        monitors.length === 0
          ? "<tr><td colspan='4' style='text-align:center;'>No monitors configured.</td></tr>"
          : monitors
              .map(
                (m) => `
        <tr>
          <td style="font-weight:600;">${m.name}</td>
          <td>${m.url}</td>
          <td><span class="badge ${m.status === "up" ? "badge-up" : "badge-down"}">${m.status}</span></td>
          <td>Every ${m.interval} mins</td>
        </tr>
      `,
              )
              .join("")
      }
    </tbody>
  </table>

  <div class="section-title">Recent Outages & Status Transitions (Last 10 Logged Events)</div>
  <table>
    <thead>
      <tr>
        <th>Monitor Name</th>
        <th>Status</th>
        <th>HTTP Code</th>
        <th>Alert Message</th>
        <th>Detected At</th>
      </tr>
    </thead>
    <tbody>
      ${
        recentAlerts.length === 0
          ? "<tr><td colspan='5' style='text-align:center;'>No recent events logged.</td></tr>"
          : recentAlerts
              .map(
                (a) => `
        <tr>
          <td style="font-weight:500;">${a.monitorId?.name || "Deleted Monitor"}</td>
          <td><span class="badge ${a.status === "up" ? "badge-up" : "badge-down"}">${a.status}</span></td>
          <td>${a.statusCode ?? "—"}</td>
          <td>${a.message || "—"}</td>
          <td>${a.timestamp ? new Date(a.timestamp).toLocaleString() : "—"}</td>
        </tr>
      `,
              )
              .join("")
      }
    </tbody>
  </table>

  <div class="footer">
    Report automatically generated by PingMonitor System. Custom backup exported under User Authentication.
  </div>
</body>
</html>
      `;
    }

    const launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    };
    if (process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1") {
      launchOptions.executablePath = "/usr/bin/chromium-browser";
    }
    browser = await chromium.launch(launchOptions);

    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        bottom: "15mm",
        left: "15mm",
        right: "15mm",
      },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("PDF Export failed on server:", error);
    if (browser) {
      try {
        await browser.close();
      } catch (err) {}
    }
    next(error);
  }
};
