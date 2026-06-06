import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import Pagination from "../components/Pagination";
import api from "../api/axios";
import { toast } from "../context/ToastContext";
import {
  ResponseTimeLineChart,
  StatusCodeDistribution,
  PeakHoursChart,
} from "../components/AnalyticsCharts";
import { useWebSocket } from "../hook/useWebSocket";
import "../styles/Analytics.css";

export default function Analytics() {
  const [monitors, setMonitors] = useState([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState("");
  const [range, setRange] = useState("7d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [monitorStats, setMonitorStats] = useState(null);
  const [monitorStatsLoading, setMonitorStatsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("alerts");
  const [alertsLog, setAlertsLog] = useState([]);
  const [alertsPage, setAlertsPage] = useState(1);
  const [alertsTotalPages, setAlertsTotalPages] = useState(1);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const [emailsLog, setEmailsLog] = useState([]);
  const [emailsPage, setEmailsPage] = useState(1);
  const [emailsTotalPages, setEmailsTotalPages] = useState(1);
  const [emailsLoading, setEmailsLoading] = useState(false);

  const fetchMonitors = useCallback(async () => {
    try {
      const { data } = await api.get("/monitors");
      setMonitors(data?.allMonitors || []);
    } catch (err) {
      toast.error("Failed to load monitors list for dropdown");
      console.log("error while fetch monitors", err);
    }
  }, []);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const { data } = await api.get("/analytics/overview");
      setOverview(data);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load analytics overview",
      );
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedMonitorId) {
      fetchOverview();
    }
  }, [selectedMonitorId, fetchOverview]);

  const fetchMonitorStats = useCallback(async () => {
    if (!selectedMonitorId) return;
    setMonitorStatsLoading(true);
    try {
      let url = `/analytics/monitors/${selectedMonitorId}?range=${range}`;
      if (range === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const { data } = await api.get(url);
      setMonitorStats(data);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load monitor stats",
      );
    } finally {
      setMonitorStatsLoading(false);
    }
  }, [selectedMonitorId, range, startDate, endDate]);

  useEffect(() => {
    if (selectedMonitorId) {
      fetchMonitorStats();
    }
  }, [selectedMonitorId, range, startDate, endDate, fetchMonitorStats]);

  const fetchAlertsLog = useCallback(async () => {
    setAlertsLoading(true);
    try {
      let url = `/analytics/alerts?page=${alertsPage}&limit=10`;
      if (selectedMonitorId) {
        url += `&monitorId=${selectedMonitorId}`;
      }
      const { data } = await api.get(url);
      setAlertsLog(data.logs || []);
      setAlertsTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error("Failed to load alerts log");
      console.log("Failed to fetch analytics alert", err);
    } finally {
      setAlertsLoading(false);
    }
  }, [alertsPage, selectedMonitorId]);

  useEffect(() => {
    fetchAlertsLog();
  }, [fetchAlertsLog]);

  const fetchEmailsLog = useCallback(async () => {
    setEmailsLoading(true);
    try {
      const { data } = await api.get(
        `/analytics/emails?page=${emailsPage}&limit=10`,
      );
      setEmailsLog(data.logs || []);
      setEmailsTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error("Failed to load email logs");
      console.log("Failed to fetch Analytics email", err);
    } finally {
      setEmailsLoading(false);
    }
  }, [emailsPage]);

  useEffect(() => {
    if (activeTab === "emails") {
      fetchEmailsLog();
    }
  }, [activeTab, fetchEmailsLog]);

  useWebSocket((event) => {
    if (event === "monitor:created" || event === "monitor:deleted") {
      fetchMonitors();
    }

    if (event === "check:completed" || event === "monitor:updated") {
      if (selectedMonitorId) {
        fetchMonitorStats();
      } else {
        fetchOverview();
      }
    }

    if (event === "alert:logged" || event === "check:completed") {
      fetchAlertsLog();
    }

    if (event === "email:logged") {
      fetchEmailsLog();
    }
  });
  useEffect(() => {
    setAlertsPage(1);
    setEmailsPage(1);
  }, [selectedMonitorId]);

  const formatDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDuration = (sec) => {
    if (sec === 0 || !sec) return "0s";
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    if (min < 60) return `${min}m ${remainingSec}s`;
    const hrs = Math.floor(min / 60);
    const remainingMin = min % 60;
    return `${hrs}h ${remainingMin}m`;
  };

  const handleExportCSV = () => {
    try {
      if (selectedMonitorId && monitorStats) {
        const headers = ["Date", "Average Response Time (ms)"];
        const rows = monitorStats.trends.map((t) => [t.date, t.responseTime]);
        downloadCSV(
          `${monitorStats.monitor.name}_stats_report.csv`,
          headers,
          rows,
        );
      } else {
        const headers = [
          "Monitor",
          "URL",
          "Status Change",
          "Reason/Message",
          "Timestamp",
        ];
        const rows = alertsLog.map((l) => [
          l.monitorId?.name || "Deleted Monitor",
          l.monitorId?.url || "N/A",
          l.status.toUpperCase(),
          l.message,
          l.timestamp,
        ]);
        downloadCSV("alerts_history_report.csv", headers, rows);
      }
      toast.success("CSV report downloaded successfully");
    } catch (err) {
      toast.error("Failed to export CSV report");
      console.log("Failed to export CSV report", err);
    }
  };

  const downloadCSV = (filename, headers, rows) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) =>
          e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content">
        <div className="analytics-container">
          <div className="analytics-header">
            <div>
              <h1 className="page-title">Analytics</h1>
              <p className="page-subtitle">
                Detailed performance insights and alerts history · Live
                WebSocket active
              </p>
            </div>
            <div className="detail-actions">
              <button className="btn btn-outline" onClick={handleExportCSV}>
                Export CSV
              </button>
              <button className="btn btn-primary" onClick={handlePrintPDF}>
                Export PDF / Print
              </button>
            </div>
          </div>

          <div className="filter-bar">
            <div className="filters-left">
              <div className="form-group dropdown-group">
                <select
                  className="form-input"
                  value={selectedMonitorId}
                  onChange={(e) => setSelectedMonitorId(e.target.value)}
                >
                  <option value="">Global Overview (All Monitors)</option>
                  {monitors.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.url})
                    </option>
                  ))}
                </select>
              </div>

              {selectedMonitorId && (
                <div className="range-selector">
                  <button
                    className={`range-btn ${range === "7d" ? "active" : ""}`}
                    onClick={() => setRange("7d")}
                  >
                    Last 7 Days
                  </button>
                  <button
                    className={`range-btn ${range === "30d" ? "active" : ""}`}
                    onClick={() => setRange("30d")}
                  >
                    Last 30 Days
                  </button>
                  <button
                    className={`range-btn ${range === "custom" ? "active" : ""}`}
                    onClick={() => setRange("custom")}
                  >
                    Custom Range
                  </button>
                </div>
              )}
            </div>

            {selectedMonitorId && range === "custom" && (
              <div className="custom-date-inputs">
                <label>Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="date-separator">to</span>
                <label>End</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {!selectedMonitorId && (
            <>
              {overviewLoading ? (
                <div
                  className="analytics-container"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "24px",
                  }}
                >
                  <div className="stats-grid">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="stat-card"
                        style={{ height: "100px" }}
                      >
                        <div
                          className="skeleton skeleton-text"
                          style={{
                            width: "45%",
                            height: "12px",
                            marginBottom: "12px",
                          }}
                        />
                        <div
                          className="skeleton skeleton-text"
                          style={{ width: "65%", height: "24px" }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="perf-widget-grid">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="perf-widget-card"
                        style={{ height: "80px" }}
                      >
                        <div
                          className="skeleton skeleton-text"
                          style={{
                            width: "40%",
                            height: "10px",
                            marginBottom: "8px",
                          }}
                        />
                        <div
                          className="skeleton skeleton-text"
                          style={{ width: "60%", height: "20px" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-label">Total Monitors</div>
                      <div className="stat-value">
                        {overview?.totalMonitors ?? 0}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Active Incidents</div>
                      <div
                        className={`stat-value ${overview?.activeAlerts > 0 ? "red" : "green"}`}
                      >
                        {overview?.activeAlerts ?? 0}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Uptime (Last 30d)</div>
                      <div className="stat-value green">
                        {overview?.overallUptime !== null
                          ? `${overview.overallUptime}%`
                          : "100%"}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Avg Response (Last 30d)</div>
                      <div className="stat-value">
                        {overview?.avgResponseTime
                          ? `${overview.avgResponseTime}ms`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="perf-widget-grid">
                    <div className="perf-widget-card">
                      <div className="perf-widget-label">Emails Dispatched</div>
                      <div className="perf-widget-value highlight-accent">
                        {overview?.emailStats?.sent ?? 0}
                      </div>
                    </div>
                    <div className="perf-widget-card">
                      <div className="perf-widget-label">Email Failures</div>
                      <div className="perf-widget-value red">
                        {overview?.emailStats?.failed ?? 0}
                      </div>
                    </div>
                    <div className="perf-widget-card">
                      <div className="perf-widget-label">Bounced Emails</div>
                      <div className="perf-widget-value yellow">
                        {overview?.emailStats?.bounced ?? 0}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {selectedMonitorId && (
            <>
              {monitorStatsLoading ? (
                <div className="monitor-detail-analytics">
                  <div className="uptime-subgrid">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="uptime-card"
                        style={{
                          height: "70px",
                          background: "none",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          className="skeleton skeleton-text"
                          style={{
                            width: "50%",
                            height: "10px",
                            margin: "0 auto 8px",
                          }}
                        />
                        <div
                          className="skeleton skeleton-text"
                          style={{
                            width: "40%",
                            height: "18px",
                            margin: "0 auto",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="stats-grid">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="stat-card"
                        style={{ height: "100px" }}
                      >
                        <div
                          className="skeleton skeleton-text"
                          style={{
                            width: "45%",
                            height: "12px",
                            marginBottom: "12px",
                          }}
                        />
                        <div
                          className="skeleton skeleton-text"
                          style={{ width: "65%", height: "24px" }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="charts-grid">
                    <div className="chart-card" style={{ height: "280px" }}>
                      <div
                        className="skeleton skeleton-title"
                        style={{ width: "30%" }}
                      />
                      <div
                        className="skeleton"
                        style={{ flex: 1, borderRadius: "var(--radius-md)" }}
                      />
                    </div>
                    <div className="chart-card" style={{ height: "280px" }}>
                      <div
                        className="skeleton skeleton-title"
                        style={{ width: "40%" }}
                      />
                      <div
                        className="skeleton"
                        style={{ flex: 1, borderRadius: "var(--radius-md)" }}
                      />
                    </div>
                  </div>
                  <div className="chart-card" style={{ height: "240px" }}>
                    <div
                      className="skeleton skeleton-title"
                      style={{ width: "20%" }}
                    />
                    <div
                      className="skeleton"
                      style={{ flex: 1, borderRadius: "var(--radius-md)" }}
                    />
                  </div>
                </div>
              ) : (
                <div className="monitor-detail-analytics">
                  <div className="uptime-subgrid">
                    <div className="uptime-card">
                      <div className="uptime-card-label">Uptime (Daily)</div>
                      <div
                        className={`uptime-card-val ${monitorStats?.uptimes?.daily < 95 ? "low-uptime" : ""}`}
                      >
                        {monitorStats?.uptimes?.daily !== undefined
                          ? `${monitorStats.uptimes.daily}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="uptime-card">
                      <div className="uptime-card-label">Uptime (Weekly)</div>
                      <div
                        className={`uptime-card-val ${monitorStats?.uptimes?.weekly < 95 ? "low-uptime" : ""}`}
                      >
                        {monitorStats?.uptimes?.weekly !== undefined
                          ? `${monitorStats.uptimes.weekly}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="uptime-card">
                      <div className="uptime-card-label">Uptime (Monthly)</div>
                      <div
                        className={`uptime-card-val ${monitorStats?.uptimes?.monthly < 95 ? "low-uptime" : ""}`}
                      >
                        {monitorStats?.uptimes?.monthly !== undefined
                          ? `${monitorStats.uptimes.monthly}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="uptime-card">
                      <div className="uptime-card-label">Uptime (Yearly)</div>
                      <div
                        className={`uptime-card-val ${monitorStats?.uptimes?.yearly < 95 ? "low-uptime" : ""}`}
                      >
                        {monitorStats?.uptimes?.yearly !== undefined
                          ? `${monitorStats.uptimes.yearly}%`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-label">Avg Response Time</div>
                      <div className="stat-value">
                        {monitorStats?.averageResponseTime
                          ? `${monitorStats.averageResponseTime}ms`
                          : "—"}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Total Downtime Duration</div>
                      <div className="stat-value red">
                        {formatDuration(monitorStats?.downtimeDuration)}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Downtime Frequency</div>
                      <div className="stat-value red">
                        {monitorStats?.downtimeFrequency ?? 0} incident
                        {monitorStats?.downtimeFrequency !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="charts-grid">
                    <div className="chart-card">
                      <h3 className="chart-card-title">
                        Response Time Trend (Average ms)
                      </h3>
                      <ResponseTimeLineChart data={monitorStats?.trends} />
                    </div>

                    <div className="chart-card">
                      <h3 className="chart-card-title">Status Codes</h3>
                      <StatusCodeDistribution
                        data={monitorStats?.statusCodes}
                      />
                    </div>
                  </div>

                  <div className="chart-card">
                    <h3 className="chart-card-title">
                      Latency by Hour of Day (Last 7 Days)
                    </h3>
                    <PeakHoursChart data={monitorStats?.peakHours} />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="detail-section">
            <div className="tabs-header">
              <button
                className={`tab-btn ${activeTab === "alerts" ? "active" : ""}`}
                onClick={() => setActiveTab("alerts")}
              >
                Alert History Log
              </button>
              <button
                className={`tab-btn ${activeTab === "emails" ? "active" : ""}`}
                onClick={() => setActiveTab("emails")}
              >
                Email Tracking Log
              </button>
            </div>

            {activeTab === "alerts" && (
              <>
                {alertsLoading ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="skeleton"
                        style={{
                          height: "42px",
                          borderRadius: "var(--radius-md)",
                        }}
                      />
                    ))}
                  </div>
                ) : alertsLog.length === 0 ? (
                  <div className="empty-state" style={{ padding: "40px" }}>
                    <div className="empty-state-icon">📋</div>
                    <h3>No alert records</h3>
                    <p>Alert logs are recorded when status transitions occur</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Monitor</th>
                          <th>Status</th>
                          <th>HTTP Code</th>
                          <th>Response</th>
                          <th>Alert Message</th>
                          <th>Detected At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alertsLog.map((log) => (
                          <tr key={log._id}>
                            <td style={{ fontWeight: 600 }}>
                              {log.monitorId?.name || "Deleted Monitor"}
                            </td>
                            <td>
                              <span className={`badge badge-${log.status}`}>
                                {log.status}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`status-code ${log.statusCode >= 400 || !log.statusCode ? "code-error" : "code-ok"}`}
                              >
                                {log.statusCode ?? "—"}
                              </span>
                            </td>
                            <td>
                              {log.responseTime ? `${log.responseTime}ms` : "—"}
                            </td>
                            <td
                              style={{
                                fontSize: "12px",
                                color: "var(--text-primary)",
                              }}
                            >
                              {log.message}
                            </td>
                            <td className="timestamp-cell">
                              {formatDateTime(log.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Pagination
                  page={alertsPage}
                  totalPages={alertsTotalPages}
                  onPageChange={setAlertsPage}
                />
              </>
            )}

            {activeTab === "emails" && (
              <>
                {emailsLoading ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="skeleton"
                        style={{
                          height: "42px",
                          borderRadius: "var(--radius-md)",
                        }}
                      />
                    ))}
                  </div>
                ) : emailsLog.length === 0 ? (
                  <div className="empty-state" style={{ padding: "40px" }}>
                    <div className="empty-state-icon">✉️</div>
                    <h3>No email logs</h3>
                    <p>Alert and verification emails logged appear here</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Recipient</th>
                          <th>Subject</th>
                          <th>Status</th>
                          <th>Failure Reason</th>
                          <th>Retry Status</th>
                          <th>Attempts</th>
                          <th>Sent At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailsLog.map((log) => (
                          <tr key={log._id}>
                            <td className="mono" style={{ fontSize: "12px" }}>
                              {log.email}
                            </td>
                            <td style={{ fontWeight: 500 }}>{log.subject}</td>
                            <td>
                              <span
                                className={`badge ${log.status === "sent" ? "badge-up" : log.status === "bounced" ? "badge-unknown" : "badge-down"}`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td
                              style={{ fontSize: "11px", color: "var(--red)" }}
                            >
                              {log.errorReason || "—"}
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  log.retryStatus === "retried"
                                    ? "badge-up"
                                    : log.retryStatus === "pending" ||
                                        log.retryStatus === "retrying"
                                      ? "badge-unknown"
                                      : log.retryStatus === "failed"
                                        ? "badge-down"
                                        : ""
                                }`}
                                style={{
                                  display:
                                    log.retryStatus === "none"
                                      ? "none"
                                      : "inline-flex",
                                }}
                              >
                                {log.retryStatus}
                              </span>
                              {log.retryStatus === "none" && (
                                <span className="mono">—</span>
                              )}
                            </td>
                            <td
                              className="mono"
                              style={{ textAlign: "center" }}
                            >
                              {log.retryCount}
                            </td>
                            <td className="timestamp-cell">
                              {formatDateTime(log.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Pagination
                  page={emailsPage}
                  totalPages={emailsTotalPages}
                  onPageChange={setEmailsPage}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
