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
} from "react-icons/fi";
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

  const pingUrl = `${import.meta.env.VITE_SERVER_URL}/api/public/heartbeat/ping/${heartbeat.token}`;

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
        <div style={{ marginBottom: "24px" }}>
          <Link
            to="/heartbeats"
            className="btn btn-ghost btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FiArrowLeft /> Back to Heartbeats
          </Link>
        </div>

        <div className="dashboard-header" style={{ marginBottom: "32px" }}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "8px",
              }}
            >
              <h1 className="page-title" style={{ margin: 0 }}>
                {heartbeat.name}
              </h1>
              <span
                className={`badge-status badge-status--${heartbeat.isActive ? heartbeat.status : "unknown"}`}
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
              }}
            >
              <FiClock /> Expected every {heartbeat.interval} (+{" "}
              {heartbeat.gracePeriod}m grace period)
            </p>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: "32px" }}>
          <div className="stat-card">
            <div className="stat-label">Uptime Percentage</div>
            <div className="stat-value green">{uptimePercentage}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Check-ins</div>
            <div className="stat-value">{heartbeat.pingCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Missed Checks</div>
            <div className="stat-value red">{heartbeat.consecutiveMissed}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Last Successful Ping</div>
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

        <div className="profile-section" style={{ marginBottom: "32px" }}>
          <div className="profile-section__header">
            <span className="profile-section__icon">
              <FiActivity />
            </span>
            <div>
              <h3 className="profile-section__title">Availability History</h3>
              <p className="profile-section__subtitle">
                Uptime tracking of the last 30 checks
              </p>
            </div>
          </div>
          <div className="profile-section__body">
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
            <div className="profile-section">
              <div className="profile-section__header">
                <span className="profile-section__icon">
                  <FiTerminal />
                </span>
                <div>
                  <h3 className="profile-section__title">Integration Guide</h3>
                  <p className="profile-section__subtitle">
                    Pings can be sent via simple GET/POST HTTP requests
                  </p>
                </div>
              </div>
              <div
                className="profile-section__body"
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

                <div className="integration-box">
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
                  <span className="profile-field__hint">
                    This executes your custom script and triggers check-in on
                    success.
                  </span>
                </div>

                <div className="integration-box">
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

            <div className="profile-section">
              <div className="profile-section__header">
                <span className="profile-section__icon">
                  <FiGlobe />
                </span>
                <div>
                  <h3 className="profile-section__title">
                    Recent check-in logs
                  </h3>
                  <p className="profile-section__subtitle">
                    Audit logs of the last check-ins from your client systems
                  </p>
                </div>
              </div>
              <div className="profile-section__body" style={{ padding: 0 }}>
                {logs.length === 0 ? (
                  <div
                    style={{
                      padding: "24px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    No check-in logs recorded yet.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "13.5px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            borderBottom: "1px solid var(--border)",
                            textAlign: "left",
                          }}
                        >
                          <th style={{ padding: "12px 16px" }}>Status</th>
                          <th style={{ padding: "12px 16px" }}>Time</th>
                          <th style={{ padding: "12px 16px" }}>IP Source</th>
                          <th style={{ padding: "12px 16px" }}>User Agent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr
                            key={log._id}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.02)",
                            }}
                          >
                            <td style={{ padding: "12px 16px" }}>
                              <span
                                className={`badge-status badge-status--${log.status}`}
                                style={{ fontSize: "10px" }}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontFamily: "var(--font-mono)",
                                fontSize: "12px",
                              }}
                            >
                              {log.ip || "unknown"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
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
            <div className="profile-section">
              <div className="profile-section__header">
                <span className="profile-section__icon">
                  <FiSettings />
                </span>
                <div>
                  <h3 className="profile-section__title">Settings</h3>
                  <p className="profile-section__subtitle">
                    Configure intervals and alerts
                  </p>
                </div>
              </div>
              <div className="profile-section__body">
                <form onSubmit={handleSaveSettings} className="form-layout">
                  <div className="profile-field">
                    <label className="profile-field__label">Monitor Name</label>
                    <input
                      type="text"
                      className="profile-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="profile-field">
                    <label className="profile-field__label">
                      Expected Interval
                    </label>
                    <select
                      className="profile-input"
                      value={interval}
                      onChange={(e) => setInterval(e.target.value)}
                    >
                      <option value="1min">1 Minute</option>
                      <option value="5min">5 Minutes</option>
                      <option value="15min">15 Minutes</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>

                  <div className="profile-field">
                    <label className="profile-field__label">
                      Grace Period (Minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="profile-input"
                      value={gracePeriod}
                      onChange={(e) => setGracePeriod(e.target.value)}
                    />
                  </div>

                  <div className="profile-field">
                    <label className="profile-field__label">
                      Alert Channels
                    </label>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        marginTop: "4px",
                      }}
                    >
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={emailAlert}
                          onChange={(e) => setEmailAlert(e.target.checked)}
                        />
                        Notify by Email
                      </label>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={inAppAlert}
                          onChange={(e) => setInAppAlert(e.target.checked)}
                        />
                        Notify in app
                      </label>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={webhookAlert}
                          onChange={(e) => setWebhookAlert(e.target.checked)}
                        />
                        Send Webhook Request
                      </label>
                    </div>
                  </div>

                  {webhookAlert && (
                    <div className="profile-field">
                      <label className="profile-field__label">
                        Webhook Endpoint URL
                      </label>
                      <input
                        type="url"
                        className="profile-input"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://yourserver.com/alerts/webhook"
                        required
                      />
                    </div>
                  )}

                  <div className="profile-field">
                    <label className="profile-field__label">
                      Escalation Emails
                    </label>
                    <input
                      type="text"
                      className="profile-input"
                      value={escalationEmails}
                      onChange={(e) => setEscalationEmails(e.target.value)}
                      placeholder="admin@mycorp.com, alerts@mycorp.com"
                    />
                    <span className="profile-field__hint">
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
