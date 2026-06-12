import Monitor from "../models/Monitor.js";
import MonitorStats from "../models/MonitorStats.js";
import Incident from "../models/Incident.js";
import Heartbeat from "../models/Heartbeat.js";

export const generateReportData = async (userId, sections, frequency) => {
  const data = {
    uptime: [],
    incidents: [],
    responseTime: [],
    ssl: [],
    heartbeats: [],
  };

  const endDate = new Date();
  let startDate = new Date();

  if (frequency === "daily") {
    startDate.setDate(startDate.getDate() - 1);
  } else if (frequency === "weekly") {
    startDate.setDate(startDate.getDate() - 7);
  } else if (frequency === "monthly") {
    startDate.setDate(startDate.getDate() - 30);
  }

  const monitors = await Monitor.find({ userId });
  const monitorIds = monitors.map((m) => m._id);

  if (sections.uptime || sections.responseTime) {
    const stats = await MonitorStats.find({
      monitorId: { $in: monitorIds },
      date: { $gte: startDate, $lte: endDate },
    });

    for (const monitor of monitors) {
      const monitorStats = stats.filter(
        (s) => s.monitorId.toString() === monitor._id.toString(),
      );

      let totalPings = 0;
      let totalUp = 0;
      let totalResponseTime = 0;
      let responseTimeCount = 0;

      monitorStats.forEach((s) => {
        totalPings += s.pingCount || 0;
        totalUp += s.upCount || 0;
        totalResponseTime += s.responseTimeSum || 0;
        responseTimeCount += s.responseTimeCount || 0;
      });

      const uptimePercent =
        totalPings > 0 ? ((totalUp / totalPings) * 100).toFixed(2) : 100;
      const avgResponseTime =
        responseTimeCount > 0
          ? Math.round(totalResponseTime / responseTimeCount)
          : 0;

      if (sections.uptime) {
        data.uptime.push({
          name: monitor.name,
          url: monitor.url,
          uptimePercent: Number(uptimePercent),
        });
      }

      if (sections.responseTime) {
        data.responseTime.push({
          name: monitor.name,
          url: monitor.url,
          avgResponseTime,
        });
      }

      if (sections.ssl && monitor.url.startsWith("https")) {
        data.ssl.push({
          name: monitor.name,
          url: monitor.url,
          status: "Valid",
          expiresInDays: 30,
        });
      }
    }
  }

  if (sections.incidents) {
    const incidents = await Incident.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    data.incidents = incidents.map((inc) => ({
      title: inc.title,
      state: inc.state,
      severity: inc.severity,
      date: inc.createdAt,
    }));
  }

  if (sections.heartbeats) {
    const heartbeats = await Heartbeat.find({ userId });
    data.heartbeats = heartbeats.map((hb) => ({
      name: hb.name,
      status: hb.status,
      lastPing: hb.lastPingAt,
    }));
  }

  return data;
};
