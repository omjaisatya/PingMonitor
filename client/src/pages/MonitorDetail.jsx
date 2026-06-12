import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import MonitorFormModal from "../components/MonitorFormModal";
import DeleteConfModal from "../components/DeleteConfModal";
import Pagination from "../components/Pagination";
import api from "../api/axios";
import { toast } from "../context/ToastContext";
import {
  ResponseTimeLineChart,
  StatusCodeDistribution,
  PeakHoursChart,
} from "../components/AnalyticsCharts";
import "../styles/Analytics.css";
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiClock,
  FiActivity,
  FiServer,
  FiFilter,
  FiMapPin,
} from "react-icons/fi";

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const formatResponseTime = (ms) => {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const getResponseTimeClass = (ms) => {
  if (!ms) return "";
  if (ms < 300) return "rt-fast";
  if (ms < 1000) return "rt-medium";
  return "rt-slow";
};

const REGION_LABELS = {
  us: "US",
  europe: "Europe",
  asia: "Asia",
  australia: "Australia",
};

const getHeatCellClass = (point) => {
  if (!point) return "region-heat-cell region-heat-cell--empty";
  if (point.status === "down") return "region-heat-cell region-heat-cell--down";
  if (point.responseTime === null || point.responseTime === undefined) {
    return "region-heat-cell region-heat-cell--empty";
  }
  if (point.responseTime < 300) return "region-heat-cell region-heat-cell--fast";
  if (point.responseTime < 1000) return "region-heat-cell region-heat-cell--medium";
  return "region-heat-cell region-heat-cell--slow";
};

const RegionalLatencyPanel = ({ regions = [], quorum }) => {
  const hasQuorum = quorum?.passed !== null && quorum?.passed !== undefined;

  return (
    <section className="regional-panel">
      <div className="regional-panel__header">
        <div>
          <h2 className="section-title regional-panel__title">
            <FiMapPin size={16} /> Regional Latency
          </h2>
          <p className="page-subtitle">
            Majority quorum: {quorum?.failedRegions ?? 0}/
            {quorum?.totalRegions || regions.length || 4} regions failing
          </p>
        </div>
        <span
          className={`badge ${quorum?.passed === false ? "badge-down" : hasQuorum ? "badge-up" : "badge-unknown"}`}
        >
          {quorum?.passed === false
            ? "regional outage"
            : hasQuorum
              ? "quorum healthy"
              : "waiting for quorum"}
        </span>
      </div>

      <div className="regional-grid">
        {regions.map((region) => (
          <article key={region.region} className="regional-card">
            <div className="regional-card__top">
              <div>
                <div className="regional-card__name">
                  {REGION_LABELS[region.region] || region.region}
                </div>
                <div className="regional-card__meta">
                  {region.averageLatency24h !== null
                    ? `${region.averageLatency24h}ms avg`
                    : "No latency yet"}
                </div>
              </div>
              <span
                className={`badge badge-${region.latest?.status || "unknown"}`}
              >
                {region.latest?.status || "unknown"}
              </span>
            </div>

            <div className="regional-card__stats">
              <span>{region.failures24h} failures</span>
              <span>{region.checks24h} checks</span>
            </div>

            <div className="region-heatmap" aria-label={`${region.region} latency heatmap`}>
              {Array.from({ length: 24 }).map((_, index) => {
                const point = region.heatmap?.[index];
                return (
                  <span
                    key={`${region.region}-${index}`}
                    className={getHeatCellClass(point)}
                    title={
                      point
                        ? `${formatResponseTime(point.responseTime)} • ${point.status}`
                        : "No check"
                    }
                  />
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default function MonitorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [monitor, setMonitor] = useState(null);
  const [logs, setLogs] = useState([]);
  const [regionalBreakdown, setRegionalBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Logs pagination states
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsFilter, setLogsFilter] = useState("all");

  // Analytics states
  const [activeTab, setActiveTab] = useState("logs");
  const [range, setRange] = useState("7d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monitorStats, setMonitorStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const { data } = await api.get(`/monitors/${id}?page=${logsPage}&limit=10&status=${logsFilter}`);
      setMonitor(data.monitor);
      setLogs(data.logs);
      setRegionalBreakdown(data.regionalBreakdown || []);
      setLogsTotalPages(data?.pagination?.totalPages || 1);
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "Failed to load monitor";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id, logsPage, logsFilter]);

  useEffect(() => {
    setLogsPage(1);
  }, [logsFilter]);

  const fetchAnalytics = useCallback(async () => {
    if (activeTab !== "analytics") return;
    setStatsLoading(true);
    try {
      let url = `/analytics/monitors/${id}?range=${range}`;
      if (range === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const { data } = await api.get(url);
      setMonitorStats(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load monitor analytics");
    } finally {
      setStatsLoading(false);
    }
  }, [id, activeTab, range, startDate, endDate]);

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 60000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleEdit = async (formData) => {
    setFormLoading(true);
    try {
      const { data } = await api.put(`/monitors/${id}`, formData);
      setMonitor(data.monitor);
      setShowEdit(false);
      toast.success(data.message);
    } catch (err) {
      const msg = err.response.data.message || err.message || "Update failed";
      toast(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      const data = await api.delete(`/monitors/${id}`);
      navigate("/dashboard");
      toast.success(data.data.message);
    } catch (err) {
      setFormLoading(false);
      const msg =
        err.response?.data?.message || err.message || "Failed to delete";
      toast.error(msg);
    }
  };

  // Compute stats from logs
  const upLogs = logs.filter((l) => l.status === "up").length;
  const uptimePct =
    logs.length > 0 ? ((upLogs / logs.length) * 100).toFixed(1) : null;
  const avgResponse =
    logs.length > 0
      ? Math.round(
          logs
            .filter((l) => l.responseTime)
            .reduce((acc, l) => acc + l.responseTime, 0) /
            logs.filter((l) => l.responseTime).length,
        )
      : null;

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <main className="main-content">
          <div className="detail-header">
            <div className="detail-header-left" style={{ width: "60%" }}>
              <div className="skeleton skeleton-title" style={{ width: "40%", height: "32px", marginBottom: "8px" }} />
              <div className="skeleton skeleton-text" style={{ width: "60%", height: "16px" }} />
            </div>
            <div className="detail-actions">
              <div className="skeleton" style={{ width: "75px", height: "34px", borderRadius: "var(--radius-md)" }} />
              <div className="skeleton" style={{ width: "75px", height: "34px", borderRadius: "var(--radius-md)", marginLeft: "12px" }} />
            </div>
          </div>
          <div className="stats-grid" style={{ marginBottom: "32px" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card" style={{ height: "100px" }}>
                <div className="skeleton skeleton-text" style={{ width: "45%", height: "12px", marginBottom: "12px" }} />
                <div className="skeleton skeleton-text" style={{ width: "65%", height: "24px" }} />
              </div>
            ))}
          </div>
          <div className="detail-section">
            <div className="skeleton skeleton-title" style={{ width: "25%", height: "24px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: "42px", borderRadius: "var(--radius-md)" }} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <main className="main-content">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>Monitor not found</h3>
            <p>It may have been deleted or you don't have access.</p>
            <Link to="/dashboard" className="btn btn-primary">
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content">
        {/* Back link */}
        <Link to="/dashboard" className="back-link" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <FiArrowLeft /> Dashboard
        </Link>

        {/* Header */}
        <div className="detail-header">
          <div className="detail-header-left">
            <div className="detail-title-row">
              <h1 className="page-title">{monitor.name}</h1>
              <span className={`badge badge-${monitor.status}`} style={{ alignSelf: "center", transform: "translateY(2px)" }}>
                {monitor.status}
              </span>
            </div>
            <p className="monitor-url-display mono">{monitor.url}</p>
          </div>
          <div className="detail-actions">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowEdit(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FiEdit2 size={13} /> Edit
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowDelete(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FiTrash2 size={13} /> Delete
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: "32px" }}>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiActivity size={14} style={{ color: "var(--accent)" }} /> Status
            </div>
            <div
              className={`stat-value ${monitor.status === "up" ? "green" : monitor.status === "down" ? "red" : "yellow"}`}
            >
              {monitor.status.toUpperCase()}
            </div>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiServer size={14} style={{ color: "var(--accent)" }} /> Uptime (last {logs.length})
            </div>
            <div
              className={`stat-value ${uptimePct >= 90 ? "green" : uptimePct >= 70 ? "yellow" : "red"}`}
            >
              {uptimePct !== null ? `${uptimePct}%` : "—"}
            </div>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiClock size={14} style={{ color: "var(--accent)" }} /> Avg Response
            </div>
            <div className="stat-value">
              {avgResponse !== null ? `${avgResponse}ms` : "—"}
            </div>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiClock size={14} style={{ color: "var(--accent)" }} /> Interval
            </div>
            <div className="stat-value">
              {monitor.interval}
              <span
                style={{
                  fontSize: "16px",
                  color: "var(--text-muted)",
                  fontWeight: 400,
                }}
              >
                m
              </span>
            </div>
          </div>
        </div>

        <RegionalLatencyPanel
          regions={regionalBreakdown}
          quorum={monitor.lastQuorum}
        />

        {/* Tabs Selection */}
        <div className="tabs-header" style={{ marginBottom: "24px", display: "flex", gap: "8px" }}>
          <button
            className={`tab-btn ${activeTab === "logs" ? "active" : ""}`}
            onClick={() => setActiveTab("logs")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FiActivity size={14} /> Recent Logs
          </button>
          <button
            className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FiClock size={14} /> Analytics & Charts
          </button>
        </div>

        {/* Tab 1: Logs */}
        {activeTab === "logs" && (
          <div className="detail-section">
            <div className="section-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                Recent Logs
                <span className="section-count">{logs.length} entries</span>
              </h2>
              
              <div className="logs-filter-wrapper" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="form-label" style={{ margin: 0, fontSize: "11px", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                  <FiFilter size={12} /> Filter:
                </span>
                <select
                  className="form-input"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "12px", minWidth: "140px", height: "32px" }}
                  value={logsFilter}
                  onChange={(e) => setLogsFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="up">UP (Success)</option>
                  <option value="down">DOWN (Failed)</option>
                </select>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="empty-state" style={{ padding: "48px 24px" }}>
                <div className="empty-state-icon" style={{ fontSize: "32px", color: "var(--text-muted)" }}>
                  <FiActivity />
                </div>
                <h3>No logs match this filter</h3>
                <p>Try switching to another status or wait for new checks</p>
              </div>
            ) : (
              <>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>HTTP Code</th>
                        <th>Response Time</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log._id}>
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
                            <span
                              className={`response-time ${getResponseTimeClass(log.responseTime)}`}
                            >
                              {formatResponseTime(log.responseTime)}
                            </span>
                          </td>
                          <td className="timestamp-cell">
                            {formatDate(log.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination page={logsPage} totalPages={logsTotalPages} onPageChange={setLogsPage} />
              </>
            )}
          </div>
        )}

        {/* Tab 2: Analytics */}
        {activeTab === "analytics" && (
          <div className="monitor-detail-analytics">
            <div className="filter-bar" style={{ padding: "12px 20px" }}>
              <div className="filters-left">
                <div className="range-selector" style={{ display: "flex", gap: "8px" }}>
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
              </div>

              {range === "custom" && (
                <div className="custom-date-inputs">
                  <label>Start</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span>to</span>
                  <label>End</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {statsLoading ? (
              <div className="monitor-detail-analytics">
                <div className="uptime-subgrid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="uptime-card" style={{ height: "70px", background: "none", border: "1px solid var(--border)" }}>
                      <div className="skeleton skeleton-text" style={{ width: "50%", height: "10px", margin: "0 auto 8px" }} />
                      <div className="skeleton skeleton-text" style={{ width: "40%", height: "18px", margin: "0 auto" }} />
                    </div>
                  ))}
                </div>
                <div className="stats-grid" style={{ marginBottom: "24px" }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="stat-card" style={{ height: "90px" }}>
                      <div className="skeleton skeleton-text" style={{ width: "40%", height: "10px", marginBottom: "8px" }} />
                      <div className="skeleton skeleton-text" style={{ width: "60%", height: "22px" }} />
                    </div>
                  ))}
                </div>
                <div className="charts-grid" style={{ marginBottom: "24px" }}>
                  <div className="chart-card" style={{ height: "280px" }}>
                    <div className="skeleton skeleton-title" style={{ width: "30%" }} />
                    <div className="skeleton" style={{ flex: 1, borderRadius: "var(--radius-md)" }} />
                  </div>
                  <div className="chart-card" style={{ height: "280px" }}>
                    <div className="skeleton skeleton-title" style={{ width: "40%" }} />
                    <div className="skeleton" style={{ flex: 1, borderRadius: "var(--radius-md)" }} />
                  </div>
                </div>
                <div className="chart-card" style={{ height: "240px" }}>
                  <div className="skeleton skeleton-title" style={{ width: "20%" }} />
                  <div className="skeleton" style={{ flex: 1, borderRadius: "var(--radius-md)" }} />
                </div>
              </div>
            ) : (
              <>
                {/* Uptime Subgrid */}
                <div className="uptime-subgrid">
                  <div className="uptime-card">
                    <div className="uptime-card-label">Uptime (Daily)</div>
                    <div className={`uptime-card-val ${monitorStats?.uptimes?.daily < 95 ? "low-uptime" : ""}`}>
                      {monitorStats?.uptimes?.daily !== undefined ? `${monitorStats.uptimes.daily}%` : "—"}
                    </div>
                  </div>
                  <div className="uptime-card">
                    <div className="uptime-card-label">Uptime (Weekly)</div>
                    <div className={`uptime-card-val ${monitorStats?.uptimes?.weekly < 95 ? "low-uptime" : ""}`}>
                      {monitorStats?.uptimes?.weekly !== undefined ? `${monitorStats.uptimes.weekly}%` : "—"}
                    </div>
                  </div>
                  <div className="uptime-card">
                    <div className="uptime-card-label">Uptime (Monthly)</div>
                    <div className={`uptime-card-val ${monitorStats?.uptimes?.monthly < 95 ? "low-uptime" : ""}`}>
                      {monitorStats?.uptimes?.monthly !== undefined ? `${monitorStats.uptimes.monthly}%` : "—"}
                    </div>
                  </div>
                  <div className="uptime-card">
                    <div className="uptime-card-label">Uptime (Yearly)</div>
                    <div className={`uptime-card-val ${monitorStats?.uptimes?.yearly < 95 ? "low-uptime" : ""}`}>
                      {monitorStats?.uptimes?.yearly !== undefined ? `${monitorStats.uptimes.yearly}%` : "—"}
                    </div>
                  </div>
                </div>

                {/* Core metrics */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Avg Response Time</div>
                    <div className="stat-value">
                      {monitorStats?.averageResponseTime ? `${monitorStats.averageResponseTime}ms` : "—"}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Downtime Duration</div>
                    <div className="stat-value red">
                      {monitorStats?.downtimeDuration !== undefined
                        ? (() => {
                            const sec = monitorStats.downtimeDuration;
                            if (sec === 0 || !sec) return "0s";
                            if (sec < 60) return `${sec}s`;
                            const min = Math.floor(sec / 60);
                            const remainingSec = sec % 60;
                            if (min < 60) return `${min}m ${remainingSec}s`;
                            const hrs = Math.floor(min / 60);
                            const remainingMin = min % 60;
                            return `${hrs}h ${remainingMin}m`;
                          })()
                        : "—"}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Downtime Frequency</div>
                    <div className="stat-value red">
                      {monitorStats?.downtimeFrequency ?? 0} incident{monitorStats?.downtimeFrequency !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* SVG Charts */}
                <div className="charts-grid">
                  <div className="chart-card">
                    <h3 className="chart-card-title">Response Time Trend (Average ms)</h3>
                    <ResponseTimeLineChart data={monitorStats?.trends} />
                  </div>

                  <div className="chart-card">
                    <h3 className="chart-card-title">Status Codes</h3>
                    <StatusCodeDistribution data={monitorStats?.statusCodes} />
                  </div>
                </div>

                {/* Hourly Performance Chart */}
                <div className="chart-card">
                  <h3 className="chart-card-title">Latency by Hour of Day (Last 7 Days)</h3>
                  <PeakHoursChart data={monitorStats?.peakHours} />
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showEdit && (
        <MonitorFormModal
          monitor={monitor}
          onClose={() => setShowEdit(false)}
          onSubmit={handleEdit}
          loading={formLoading}
        />
      )}
      {showDelete && (
        <DeleteConfModal
          monitor={monitor}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDelete}
          loading={formLoading}
        />
      )}
    </div>
  );
}
