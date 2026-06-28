import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { toast } from "../context/ToastContext";
import {
  FiArrowLeft,
  FiClock,
  FiGlobe,
  FiTerminal,
  FiSettings,
  FiInfo,
  FiActivity,
  FiCopy,
  FiCheck,
  FiServer,
  FiAlertTriangle,
} from "react-icons/fi";
import { FaHeart, FaHeartBroken } from "react-icons/fa";
import "../styles/Heartbeats.css";

export default function HeartbeatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [heartbeat, setHeartbeat] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [interval, setInterval] = useState("5min");
  const [gracePeriod, setGracePeriod] = useState(2);
  const [emailAlert, setEmailAlert] = useState(true);
  const [inAppAlert, setInAppAlert] = useState(true);
  const [webhookAlert, setWebhookAlert] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [escalationEmails, setEscalationEmails] = useState("");

  const fetchDetail = useCallback(async () => {
    try {
      const { data } = await api.get(`/heartbeats/${id}`);
      setHeartbeat(data.heartbeat);
      setLogs(data.logs || []);

      setName(data.heartbeat.name);
      setInterval(data.heartbeat.interval);
      setGracePeriod(data.heartbeat.gracePeriod);
      setEmailAlert(data.heartbeat.alertChannels?.email ?? true);
      setInAppAlert(data.heartbeat.alertChannels?.inApp ?? true);
      setWebhookAlert(data.heartbeat.alertChannels?.webhook ?? false);
      setWebhookUrl(data.heartbeat.webhookUrl || "");
      setEscalationEmails((data.heartbeat.escalationEmails || []).join(", "));
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load heartbeat details",
      );
      navigate("/heartbeats");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Command copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const emailsArray = escalationEmails
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      const payload = {
        name,
        interval,
        gracePeriod: Number(gracePeriod),
        alertChannels: {
          email: emailAlert,
          inApp: inAppAlert,
          webhook: webhookAlert,
        },
        webhookUrl: webhookAlert ? webhookUrl : "",
        escalationEmails: emailsArray,
      };

      const { data } = await api.put(`/heartbeats/${id}`, payload);
      setHeartbeat(data.heartbeat);
      toast.success(data.message);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save heartbeat settings",
      );
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <main className="main-content">
          <div
            className="skeleton skeleton-title"
            style={{ width: "30%", height: "32px", marginBottom: "24px" }}
          />
          <div className="skeleton skeleton-card" style={{ height: "300px" }} />
        </main>
      </div>
    );
  }

  if (!heartbeat) return null;

  const pingUrl = `${import.meta.env.VITE_SERVER_URL}/public/heartbeat/ping/${heartbeat.token}`;

  const curlCommand = `curl -m 10 --retry 5 "${pingUrl}"`;
  const pythonSnippet = `import urllib.request\ntry:\n    urllib.request.urlopen("${pingUrl}", timeout=10)\nexcept Exception as e:\n    print(f"Failed: {e}")`;

  const timelineBlocks = Array.from({ length: 30 })
    .map((_, idx) => {
      const log = logs[idx];
      if (!log) return "empty";
      return log.status === "up" ? "up" : "down";
    })
    .reverse();

  const uptimePercentage =
    heartbeat.pingCount > 0
      ? Math.round((heartbeat.upCount / heartbeat.pingCount) * 100)
      : 100;

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content">
        <Link
          to="/heartbeats"
          className="back-link"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "24px" }}
        >
          <FiArrowLeft /> Heartbeats
        </Link>

        <div className="detail-header">
          <div className="detail-header-left">
            <div className="detail-title-row">
              {heartbeat.isActive ? (
                heartbeat.status === "up" ? (
                  <FaHeart className="heart-icon heart-icon--live heart-icon--large" />
                ) : (
                  <FaHeartBroken className="heart-icon heart-icon--broken heart-icon--large" />
                )
              ) : (
                <FaHeart className="heart-icon heart-icon--paused heart-icon--large" />
              )}
              <h1 className="page-title" style={{ margin: 0 }}>
                {heartbeat.name}
              </h1>
              <span
                className={`badge-status badge-status--${heartbeat.isActive ? heartbeat.status : "unknown"}`}
                style={{ alignSelf: "center", transform: "translateY(2px)" }}
              >
                {heartbeat.isActive ? heartbeat.status : "PAUSED"}
              </span>
            </div>
            <p
              className="page-subtitle"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "4px",
              }}
            >
              <FiClock /> Expected every {heartbeat.interval} (+{" "}
              {heartbeat.gracePeriod}m grace period)
            </p>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: "32px" }}>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiServer size={14} style={{ color: "var(--accent)" }} /> Uptime Percentage
            </div>
            <div className="stat-value green">{uptimePercentage}%</div>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiActivity size={14} style={{ color: "var(--accent)" }} /> Total Check-ins
            </div>
            <div className="stat-value">{heartbeat.pingCount}</div>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiAlertTriangle size={14} style={{ color: "var(--accent)" }} /> Missed Checks
            </div>
            <div className="stat-value red">{heartbeat.consecutiveMissed}</div>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiClock size={14} style={{ color: "var(--accent)" }} /> Last Successful Ping
            </div>
            <div
              className="stat-value"
              style={{ fontSize: "16px", paddingTop: "8px" }}
            >
              {heartbeat.lastPingAt
                ? new Date(heartbeat.lastPingAt).toLocaleString()
                : "Never"}
            </div>
          </div>
        </div>

        <div className="detail-section" style={{ marginBottom: "32px" }}>
          <div className="section-header-row" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <h2 className="section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <FiActivity size={18} /> Availability History
            </h2>
          </div>
          <div className="section-body">
            <div className="history-timeline">
              {timelineBlocks.map((status, index) => (
                <div
                  key={index}
                  className={`timeline-bar timeline-bar--${status}`}
                  title={
                    status !== "empty"
                      ? `Status: ${status.toUpperCase()}`
                      : "No check-in log available"
                  }
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "8px",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <span>30 checks ago</span>
              <span>Uptime: {uptimePercentage}%</span>
              <span>Now</span>
            </div>
          </div>
        </div>

        <div className="heartbeat-detail-grid">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "32px" }}
          >
            <div className="detail-section">
              <div className="section-header-row" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <h2 className="section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiTerminal /> Integration Guide
                </h2>
              </div>
              <div
                className="section-body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                    margin: 0,
                  }}
                >
                  Configure your background system, backups task, cron jobs, or
                  monitoring scripts to request the following URL on completion:
                </p>

                <div className="copy-input-group">
                  <span className="copy-input">{pingUrl}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleCopy(pingUrl)}
                    style={{ padding: "8px" }}
                  >
                    {copied ? (
                      <FiCheck size={14} style={{ color: "var(--green)" }} />
                    ) : (
                      <FiCopy size={14} />
                    )}
                  </button>
                </div>

                <div className="integration-box" style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px", marginTop: "12px" }}>
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "13px",
                      color: "var(--text-primary)",
                    }}
                  >
                    Crontab Setup Example
                  </h4>
                  <div className="code-block">
                    * * * * * /path/to/my-script.sh && {curlCommand}
                  </div>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                    This executes your custom script and triggers check-in on
                    success.
                  </span>
                </div>

                <div className="integration-box" style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px" }}>
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "13px",
                      color: "var(--text-primary)",
                    }}
                  >
                    Python check-in Snippet
                  </h4>
                  <pre
                    className="code-block"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {pythonSnippet}
                  </pre>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <div className="section-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 className="section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiGlobe /> Recent check-in logs
                </h2>
              </div>
              <div className="section-body" style={{ padding: 0 }}>
                {logs.length === 0 ? (
                  <div className="empty-state" style={{ padding: "32px" }}>
                    No check-in logs recorded yet.
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Time</th>
                          <th>IP Source</th>
                          <th>User Agent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log._id}>
                            <td>
                              <span className={`badge-status badge-status--${log.status}`}>
                                {log.status}
                              </span>
                            </td>
                            <td>
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="mono" style={{ fontSize: "12px" }}>
                              {log.ip || "unknown"}
                            </td>
                            <td
                              style={{
                                maxWidth: "200px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={log.userAgent}
                            >
                              {log.userAgent || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="detail-section">
              <div className="section-header-row" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <h2 className="section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiSettings /> Settings
                </h2>
              </div>
              <div className="section-body">
                <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="form-group">
                    <label className="form-label">Monitor Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expected Interval</label>
                    <select
                      className="form-input"
                      value={interval}
                      onChange={(e) => setInterval(e.target.value)}
                      style={{ backgroundPosition: "right 12px center" }}
                    >
                      <option value="1min">1 Minute</option>
                      <option value="5min">5 Minutes</option>
                      <option value="15min">15 Minutes</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Grace Period (Minutes)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={gracePeriod}
                      onChange={(e) => setGracePeriod(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Alert Channels</label>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        marginTop: "8px",
                      }}
                    >
                      <label className="switch-label">
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={emailAlert}
                          onChange={(e) => setEmailAlert(e.target.checked)}
                        />
                        <span className="switch-slider" />
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Notify by Email</span>
                      </label>
                      <label className="switch-label">
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={inAppAlert}
                          onChange={(e) => setInAppAlert(e.target.checked)}
                        />
                        <span className="switch-slider" />
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Notify in app</span>
                      </label>
                      <label className="switch-label">
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={webhookAlert}
                          onChange={(e) => setWebhookAlert(e.target.checked)}
                        />
                        <span className="switch-slider" />
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Send Webhook Request</span>
                      </label>
                    </div>
                  </div>

                  {webhookAlert && (
                    <div className="form-group" style={{ animation: "fadeIn 0.2s ease" }}>
                      <label className="form-label">Webhook Endpoint URL</label>
                      <input
                        type="url"
                        className="form-input"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://yourserver.com/alerts/webhook"
                        required
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Escalation Emails</label>
                    <input
                      type="text"
                      className="form-input"
                      value={escalationEmails}
                      onChange={(e) => setEscalationEmails(e.target.value)}
                      placeholder="admin@mycorp.com, alerts@mycorp.com"
                    />
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                      Comma separated emails to notify.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: "100%", marginTop: "12px" }}
                    disabled={saveLoading}
                  >
                    {saveLoading ? "Saving..." : "Save Settings"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
