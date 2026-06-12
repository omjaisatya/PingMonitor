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
} from "react-icons/fi";
import "../styles/Heartbeats.css";

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

  const handleToggleActive = async (id, isActive) => {
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
              <div className="stat-label">Total</div>
              <div className="stat-value">{heartbeats.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Healthy</div>
              <div className="stat-value green">{upCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Missing</div>
              <div className="stat-value red">{downCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Paused</div>
              <div className="stat-value yellow">
                {pausedCount + pendingCount}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="heartbeats-grid">
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
          <div className="empty-state">
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
            <h3>No heartbeats yet</h3>
            <p>
              Create a heartbeat endpoint and ping it from your cron jobs or
              background scripts
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
                margin: "16px auto 0",
              }}
            >
              <FiPlus size={16} /> Create Heartbeat Endpoint
            </button>
          </div>
        ) : (
          <div className="heartbeats-grid">
            {heartbeats.map((hb) => {
              const statusClass = hb.isActive
                ? hb.status === "up"
                  ? "heartbeat-card--up"
                  : hb.status === "down"
                    ? "heartbeat-card--down"
                    : ""
                : "";
              const checkInUrl = `${import.meta.env.VITE_SERVER_URL}/api/public/heartbeat/ping/${hb.token}`;

              return (
                <div key={hb._id} className={`heartbeat-card ${statusClass}`}>
                  <div className="monitor-card-header">
                    <span
                      className={`badge-status badge-status--${hb.isActive ? hb.status : "unknown"}`}
                    >
                      {hb.isActive ? hb.status : "PAUSED"}
                    </span>
                    <span
                      className="monitor-interval"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FiClock size={12} /> {hb.interval}
                    </span>
                  </div>

                  <div className="monitor-card-body">
                    <Link
                      to={`/heartbeats/${hb._id}`}
                      className="monitor-name"
                      style={{ textDecoration: "none" }}
                    >
                      {hb.name}
                    </Link>
                    <div className="copy-input-group">
                      <span className="copy-input">{checkInUrl}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleCopy(hb.token, hb._id)}
                        title="Copy ping URL"
                        style={{ padding: "8px" }}
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

                    <div
                      style={{
                        marginTop: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div className="heartbeat-info-row">
                        <span>Last Check-in:</span>
                        <span className="heartbeat-info-value">
                          {hb.lastPingAt
                            ? new Date(hb.lastPingAt).toLocaleTimeString()
                            : "Never"}
                        </span>
                      </div>
                      <div className="heartbeat-info-row">
                        <span>Uptime:</span>
                        <span className="heartbeat-info-value">
                          {hb.pingCount > 0
                            ? `${Math.round((hb.upCount / hb.pingCount) * 100)}%`
                            : "100%"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="monitor-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleToggleActive(hb._id, hb.isActive)}
                    >
                      {hb.isActive ? (
                        <>
                          <FiPause size={13} /> Pause
                        </>
                      ) : (
                        <>
                          <FiPlay size={13} /> Resume
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(hb._id)}
                      style={{ marginLeft: "auto" }}
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: "500px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal__title">Create Heartbeat Monitor</h3>
            <p className="modal__message">
              This endpoint pings passively from your backups, cron jobs, or
              server task runners.
            </p>
            <form onSubmit={handleCreate} className="form-layout">
              <div className="profile-field">
                <label className="profile-field__label">Monitor Name</label>
                <input
                  type="text"
                  className="profile-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Daily DB Backup Job"
                  required
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
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
                    max="60"
                    className="profile-input"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(e.target.value)}
                  />
                </div>
              </div>

              <div className="profile-field">
                <label className="profile-field__label">Alert Channels</label>
                <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
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
                    Email
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
                    In-App
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
                    Webhook
                  </label>
                </div>
              </div>

              {webhookAlert && (
                <div className="profile-field animate-fade-in">
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
                  placeholder="admin@mycorp.com, devops@mycorp.com"
                />
                <span className="profile-field__hint">
                  Comma separated list of extra email addresses to notify.
                </span>
              </div>

              <div className="modal__actions">
                <button
                  type="button"
                  className="btn btn-ghost"
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
