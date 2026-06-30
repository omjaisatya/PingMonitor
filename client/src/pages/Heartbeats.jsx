import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { toast } from "../context/ToastContext";
import { useAuth } from "../hook/useAuth";
import {
  FiPlus,
  FiActivity,
  FiCopy,
  FiCheck,
  FiTrash2,
  FiPlay,
  FiPause,
  FiClock,
  FiAlertTriangle,
  FiChevronRight,
} from "react-icons/fi";
import "../styles/Heartbeats.css";
import "../styles/Synthetic.css";

export default function Heartbeats() {
  const [heartbeats, setHeartbeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const { user } = useAuth();
  const isVerified = user?.isVerified !== false;

  const [name, setName] = useState("");
  const [interval, setInterval] = useState("5min");
  const [gracePeriod, setGracePeriod] = useState(2);
  const [emailAlert, setEmailAlert] = useState(true);
  const [inAppAlert, setInAppAlert] = useState(true);
  const [webhookAlert, setWebhookAlert] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [escalationEmails, setEscalationEmails] = useState("");

  const [pingMonitors, setPingMonitors] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchPingMonitors = async () => {
      try {
        const { data } = await api.get("/monitors");
        const mons = data.allMonitors || data.monitors || (Array.isArray(data) ? data : []);
        setPingMonitors(mons);
      } catch (err) {
        console.error("Failed to fetch monitors for suggestion:", err);
      }
    };
    fetchPingMonitors();
  }, []);

  useEffect(() => {
    if (!name.trim()) {
      setSuggestions([]);
      return;
    }

    const handler = setTimeout(() => {
      const filtered = pingMonitors
        .filter((mon) =>
          mon.name.toLowerCase().includes(name.toLowerCase())
        )
        .map((mon) => mon.name);
      setSuggestions(filtered);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [name, pingMonitors]);

  const fetchHeartbeats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/heartbeats");
      setHeartbeats(data.heartbeats || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load heartbeats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeartbeats();
  }, [fetchHeartbeats]);

  const handleCopy = (token, id) => {
    const checkInUrl = `${import.meta.env.VITE_SERVER_URL}/public/heartbeat/ping/${token}`;
    navigator.clipboard.writeText(checkInUrl);
    setCopiedId(id);
    toast.success("Ping URL copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (id) => {
    try {
      const { data } = await api.post(`/heartbeats/${id}/pause`);
      setHeartbeats((prev) =>
        prev.map((hb) => (hb._id === id ? data.heartbeat : hb)),
      );
      toast.success(data.message);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to change heartbeat status",
      );
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this heartbeat monitor? All check-in history will be lost.",
      )
    )
      return;
    try {
      await api.delete(`/heartbeats/${id}`);
      setHeartbeats((prev) => prev.filter((hb) => hb._id !== id));
      toast.success("Heartbeat monitor deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete heartbeat");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!isVerified) {
      toast.warning("Please verify your email address to add monitors");
      return;
    }

    setFormLoading(true);
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

      const { data } = await api.post("/heartbeats", payload);
      setHeartbeats((prev) => [data.heartbeat, ...prev]);
      toast.success(data.message);

      // Reset form
      setName("");
      setInterval("5min");
      setGracePeriod(2);
      setEmailAlert(true);
      setInAppAlert(true);
      setWebhookAlert(false);
      setWebhookUrl("");
      setEscalationEmails("");
      setShowAddModal(false);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to create heartbeat monitor",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const upCount = heartbeats.filter(
    (hb) => hb.status === "up" && hb.isActive,
  ).length;
  const downCount = heartbeats.filter(
    (hb) => hb.status === "down" && hb.isActive,
  ).length;
  const pausedCount = heartbeats.filter((hb) => !hb.isActive).length;
  const pendingCount = heartbeats.filter(
    (hb) => hb.status === "unknown" && hb.isActive,
  ).length;

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h1 className="page-title">Heartbeat Monitors</h1>
            <p className="page-subtitle">
              {heartbeats.length} passive heartbeat service
              {heartbeats.length !== 1 ? "s" : ""} configured
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() =>
              isVerified
                ? setShowAddModal(true)
                : toast.warning(
                    "Verify your email before adding heartbeat monitors",
                  )
            }
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FiPlus size={16} /> Add Heartbeat
          </button>
        </div>

        {!loading && heartbeats.length > 0 && (
          <div className="stats-grid" style={{ marginBottom: "32px" }}>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="card-icon-wrapper">
                  <FiActivity className="stat-card-icon text-accent" />
                </span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-value">{heartbeats.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="card-icon-wrapper">
                  <FiCheck className="stat-card-icon text-green" />
                </span>
                <span className="stat-label">Healthy</span>
              </div>
              <div className="stat-value green">{upCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="card-icon-wrapper">
                  <FiAlertTriangle className="stat-card-icon text-red" />
                </span>
                <span className="stat-label">Missing</span>
              </div>
              <div className="stat-value red">{downCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="card-icon-wrapper">
                  <FiClock className="stat-card-icon text-yellow" />
                </span>
                <span className="stat-label">Paused</span>
              </div>
              <div className="stat-value yellow">
                {pausedCount + pendingCount}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="synthetic-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div
                  className="skeleton skeleton-title"
                  style={{ width: "50%" }}
                />
                <div
                  className="skeleton skeleton-text"
                  style={{ width: "80%" }}
                />
                <div
                  className="skeleton skeleton-text"
                  style={{ width: "40%", marginTop: "auto" }}
                />
              </div>
            ))}
          </div>
        ) : heartbeats.length === 0 ? (
          <div className="empty-state-card">
            <div
              className="empty-state-icon"
              style={{
                fontSize: "36px",
                color: "var(--text-muted)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <FiActivity size={36} />
            </div>
            <h3>No Heartbeats Configured</h3>
            <p>
              Create a heartbeat endpoint and ping it from your cron jobs or
              background scripts.
            </p>
            <button
              className="btn btn-primary"
              onClick={() =>
                isVerified
                  ? setShowAddModal(true)
                  : toast.warning(
                      "Verify your email before adding heartbeat monitors",
                    )
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "12px",
              }}
            >
              <FiPlus size={16} /> Create Heartbeat Endpoint
            </button>
          </div>
        ) : (
          <div className="synthetic-grid">
            {heartbeats.map((hb) => {
              const badgeClass = !hb.isActive
                ? "paused"
                : hb.status === "up"
                  ? "success"
                  : hb.status === "down"
                    ? "failed"
                    : "paused";
              const badgeText = !hb.isActive
                ? "PAUSED"
                : hb.status === "up"
                  ? "HEALTHY"
                  : hb.status === "down"
                    ? "MISSING"
                    : "UNKNOWN";
              const checkInUrl = `${import.meta.env.VITE_SERVER_URL}/public/heartbeat/ping/${hb.token}`;

              return (
                <div key={hb._id} className="synthetic-card">
                  <div>
                    <div className="card-top">
                      <Link
                        to={`/heartbeats/${hb._id}`}
                        className="card-title"
                      >
                        {hb.name}
                      </Link>
                      <span className="card-interval">
                        <FiClock
                          style={{ marginRight: "4px", verticalAlign: "middle" }}
                        />
                        Every {hb.interval}
                      </span>
                    </div>

                    <div className="card-middle" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div className="copy-input-group" style={{ margin: 0 }}>
                        <span className="copy-input" style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>{checkInUrl}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleCopy(hb.token, hb._id)}
                          title="Copy ping URL"
                          style={{ padding: "6px" }}
                        >
                          {copiedId === hb._id ? (
                            <FiCheck
                              size={13}
                              style={{ color: "var(--green)" }}
                            />
                          ) : (
                            <FiCopy size={13} />
                          )}
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>Last Check-in:</span>
                          <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                            {hb.lastPingAt
                              ? new Date(hb.lastPingAt).toLocaleTimeString()
                              : "Never"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>Uptime:</span>
                          <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                            {hb.pingCount > 0
                              ? `${Math.round((hb.upCount / hb.pingCount) * 100)}%`
                              : "100%"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-bottom" style={{ marginTop: "16px" }}>
                    <span className={`status-badge badge-${badgeClass}`}>
                      {badgeText}
                    </span>

                    <div className="card-actions">
                      <button
                        className="btn-icon-only"
                        onClick={() => handleToggleActive(hb._id)}
                        title={hb.isActive ? "Pause Monitor" : "Resume Monitor"}
                      >
                        {hb.isActive ? (
                          <FiPause size={16} />
                        ) : (
                          <FiPlay size={16} />
                        )}
                      </button>
                      <button
                        className="btn-icon-only btn-delete"
                        onClick={() => handleDelete(hb._id)}
                        title="Delete Monitor"
                      >
                        <FiTrash2 size={16} />
                      </button>
                      <Link
                        to={`/heartbeats/${hb._id}`}
                        className="btn-icon-only"
                        title="View Details"
                        style={{ color: "var(--accent)" }}
                      >
                        <FiChevronRight size={18} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: "500px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FiPlus size={20} /> Create Heartbeat Monitor
            </h2>
            <p className="modal__message" style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
              This endpoint pings passively from your backups, cron jobs, or
              server task runners.
            </p>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ position: "relative" }}>
                <label className="form-label">Monitor Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="e.g. Daily DB Backup Job"
                  required
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="suggestions-list">
                    {suggestions.map((suggestName, idx) => (
                      <li
                        key={idx}
                        className="suggestion-item"
                        onClick={() => {
                          setName(suggestName);
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
                    max="60"
                    className="form-input"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alert Channels</label>
                <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={emailAlert}
                      onChange={(e) => setEmailAlert(e.target.checked)}
                    />
                    <span className="switch-slider" />
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Email</span>
                  </label>
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={inAppAlert}
                      onChange={(e) => setInAppAlert(e.target.checked)}
                    />
                    <span className="switch-slider" />
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>In-App</span>
                  </label>
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={webhookAlert}
                      onChange={(e) => setWebhookAlert(e.target.checked)}
                    />
                    <span className="switch-slider" />
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Webhook</span>
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
                  placeholder="admin@mycorp.com, devops@mycorp.com"
                />
                <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                  Comma separated list of extra email addresses to notify.
                </span>
              </div>

              <div className="modal-actions" style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? "Creating..." : "Create Monitor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
