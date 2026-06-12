import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { toast } from "../context/ToastContext";
import { useAuth } from "../hook/useAuth";
import {
  FiPlus,
  FiTrash2,
  FiPlay,
  FiPause,
  FiClock,
  FiActivity,
  FiChevronRight,
  FiEdit3,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";
import "../styles/Synthetic.css";

const SCRIPT_TEMPLATE = `// Step 1: Navigate to the page
await page.goto("https://example.com");

// Step 2: Extract text content or locate elements
const heading = await page.locator("h1");
const headingText = await heading.textContent();
console.log("Found Heading Content:", headingText);

// Step 3: Write assertions using expect()
expect(headingText).toContain("Example Domain");`;

export default function SyntheticMonitors() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const { user } = useAuth();
  const isVerified = user?.isVerified !== false;

  const [name, setName] = useState("");
  const [script, setScript] = useState(SCRIPT_TEMPLATE);
  const [interval, setInterval] = useState(15);
  const [timeout, setTimeoutVal] = useState(30000);
  const [emailAlert, setEmailAlert] = useState(true);
  const [inAppAlert, setInAppAlert] = useState(true);
  const [webhookAlert, setWebhookAlert] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [escalationEmails, setEscalationEmails] = useState("");
  const [alertCooldown, setAlertCooldown] = useState(30);

  const fetchMonitors = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/synthetic-monitors");
      setMonitors(data.synthetics || []);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load synthetic monitors",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  const openCreateModal = () => {
    setEditingMonitor(null);
    setName("");
    setScript(SCRIPT_TEMPLATE);
    setInterval(15);
    setTimeoutVal(30000);
    setEmailAlert(true);
    setInAppAlert(true);
    setWebhookAlert(false);
    setWebhookUrl("");
    setEscalationEmails("");
    setAlertCooldown(30);
    setShowAddModal(true);
  };

  const openEditModal = (monitor) => {
    setEditingMonitor(monitor);
    setName(monitor.name);
    setScript(monitor.script);
    setInterval(monitor.interval);
    setTimeoutVal(monitor.timeout || 30000);
    setEmailAlert(monitor.alertChannels?.email ?? true);
    setInAppAlert(monitor.alertChannels?.inApp ?? true);
    setWebhookAlert(monitor.alertChannels?.webhook ?? false);
    setWebhookUrl(monitor.webhookUrl || "");
    setEscalationEmails(monitor.escalationEmails?.join(", ") || "");
    setAlertCooldown(monitor.alertCooldown || 30);
    setShowAddModal(true);
  };

  const handleToggleActive = async (id) => {
    try {
      const { data } = await api.post(`/synthetic-monitors/${id}/pause`);
      setMonitors((prev) =>
        prev.map((m) => (m._id === id ? data.synthetic : m)),
      );
      toast.success(data.message);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to toggle active status",
      );
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this synthetic monitor? All execution runs history, screenshots and video files will be permanently deleted.",
      )
    ) {
      return;
    }
    try {
      await api.delete(`/synthetic-monitors/${id}`);
      setMonitors((prev) => prev.filter((m) => m._id !== id));
      toast.success("Synthetic monitor successfully deleted");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to delete synthetic monitor",
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isVerified) {
      toast.warning("Please verify your email address to add/edit monitors");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter a name for the monitor");
      return;
    }

    if (!script.trim()) {
      toast.error("Please provide a playwright automation script");
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
        script,
        interval: Number(interval),
        timeout: Number(timeout),
        alertChannels: {
          email: emailAlert,
          inApp: inAppAlert,
          webhook: webhookAlert,
        },
        webhookUrl,
        escalationEmails: emailsArray,
        alertCooldown: Number(alertCooldown),
      };

      if (editingMonitor) {
        const { data } = await api.put(
          `/synthetic-monitors/${editingMonitor._id}`,
          payload,
        );
        setMonitors((prev) =>
          prev.map((m) => (m._id === editingMonitor._id ? data.synthetic : m)),
        );
        toast.success("Synthetic monitor updated successfully");
      } else {
        const { data } = await api.post("/synthetic-monitors", payload);
        setMonitors((prev) => [data.synthetic, ...prev]);
        toast.success("Synthetic monitor created successfully");
      }
      setShowAddModal(false);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save synthetic monitor",
      );
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="synthetic-container">
        {/* Header */}
        <div className="synthetic-header-row">
          <div>
            <h1>Browser Synthetic Monitoring</h1>
            <p>
              Run scheduled Playwright scripts to monitor login, checkout, and
              form flows in real-time.
            </p>
          </div>
          <button className="btn-primary" onClick={openCreateModal}>
            <FiPlus /> New Synthetic Monitor
          </button>
        </div>

        {/* Verifying alert */}
        {!isVerified && (
          <div
            className="empty-state-card"
            style={{ border: "1px dashed #ffa800", marginBottom: "24px" }}
          >
            <FiAlertCircle size={24} style={{ color: "#ffa800" }} />
            <p style={{ color: "#ffa800", margin: 0 }}>
              Your account email is unverified. Verification is required to
              create synthetic monitors or trigger alerts.
            </p>
          </div>
        )}

        {/* Dashboard Grid */}
        {loading ? (
          <div
            className="modal-loading"
            style={{
              minHeight: "250px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span className="spinner spinner-lg"></span>
            <p style={{ color: "var(--text-muted)" }}>
              Loading synthetic monitors...
            </p>
          </div>
        ) : monitors.length === 0 ? (
          <div className="empty-state-card">
            <FiActivity size={48} className="muted-icon" />
            <h3>No Synthetic Monitors Configured</h3>
            <p>
              Write your first automated browser check using Playwright script
              context.
            </p>
            <button
              className="btn-primary"
              onClick={openCreateModal}
              style={{ marginTop: "12px" }}
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="synthetic-grid">
            {monitors.map((monitor) => (
              <div key={monitor._id} className="synthetic-card">
                <div>
                  <div className="card-top">
                    <Link
                      to={`/synthetic/${monitor._id}`}
                      className="card-title"
                    >
                      {monitor.name}
                    </Link>
                    <span className="card-interval">
                      <FiClock
                        style={{ marginRight: "4px", verticalAlign: "middle" }}
                      />
                      Every {monitor.interval}m
                    </span>
                  </div>

                  <div className="card-middle">
                    <pre className="card-script-preview">{monitor.script}</pre>
                  </div>
                </div>

                <div className="card-bottom">
                  <span className={`status-badge badge-${monitor.status}`}>
                    {monitor.status.toUpperCase()}
                  </span>

                  <div className="card-actions">
                    <button
                      className="btn-icon-only"
                      onClick={() => handleToggleActive(monitor._id)}
                      title={
                        monitor.isActive ? "Pause Monitor" : "Resume Monitor"
                      }
                    >
                      {monitor.isActive ? (
                        <FiPause size={16} />
                      ) : (
                        <FiPlay size={16} />
                      )}
                    </button>
                    <button
                      className="btn-icon-only"
                      onClick={() => openEditModal(monitor)}
                      title="Edit Configuration"
                    >
                      <FiEdit3 size={16} />
                    </button>
                    <button
                      className="btn-icon-only btn-delete"
                      onClick={() => handleDelete(monitor._id)}
                      title="Delete Monitor"
                    >
                      <FiTrash2 size={16} />
                    </button>
                    <Link
                      to={`/synthetic/${monitor._id}`}
                      className="btn-icon-only"
                      title="View Details"
                      style={{ color: "var(--accent-color)" }}
                    >
                      <FiChevronRight size={18} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="synthetic-modal-overlay">
          <div className="synthetic-modal-content">
            <div className="synthetic-modal-header">
              <h2>
                {editingMonitor
                  ? "Modify Synthetic Monitor"
                  : "Create Browser Synthetic Monitor"}
              </h2>
              <button
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="synthetic-form">
              <div className="form-group">
                <label>Monitor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Auth Login Flow Monitor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Run Interval</label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                  >
                    <option value={5}>Every 5 Minutes</option>
                    <option value={10}>Every 10 Minutes</option>
                    <option value={15}>Every 15 Minutes</option>
                    <option value={30}>Every 30 Minutes</option>
                    <option value={60}>Hourly (60 Min)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Timeout (ms)</label>
                  <input
                    type="number"
                    min="5000"
                    max="60000"
                    placeholder="30000"
                    value={timeout}
                    onChange={(e) => setTimeoutVal(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Playwright Script (Node VM Environment)</label>
                <textarea
                  className="script-editor-textarea"
                  placeholder={SCRIPT_TEMPLATE}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  required
                />
                <small
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  Globals injected: <code>page</code>, <code>browser</code>,{" "}
                  <code>context</code>, <code>expect</code> (toBe, toContain,
                  toBeGreaterThan, toBeLessThan, truthy/falsy).
                </small>
              </div>

              <div className="form-group">
                <label>Notification Channels</label>
                <div className="alerts-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={emailAlert}
                      onChange={(e) => setEmailAlert(e.target.checked)}
                    />
                    Enable Email Alerts
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={inAppAlert}
                      onChange={(e) =>
                        InAppNotification !== undefined &&
                        setInAppAlert(e.target.checked)
                      }
                    />
                    Enable In-App Notifications
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={webhookAlert}
                      onChange={(e) => setWebhookAlert(e.target.checked)}
                    />
                    Trigger Webhook URL
                  </label>
                </div>
              </div>

              {webhookAlert && (
                <div className="form-group">
                  <label>Webhook endpoint URL</label>
                  <input
                    type="text"
                    placeholder="https://yourserver.com/alerts/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Alert Cool-down (minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="360"
                    value={alertCooldown}
                    onChange={(e) => setAlertCooldown(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Escalation Emails (comma separated)</label>
                  <input
                    type="text"
                    placeholder="devops@comp.com, admin@comp.com"
                    value={escalationEmails}
                    onChange={(e) => setEscalationEmails(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formLoading}
                >
                  {formLoading
                    ? "Saving..."
                    : editingMonitor
                      ? "Save Changes"
                      : "Create Monitor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
