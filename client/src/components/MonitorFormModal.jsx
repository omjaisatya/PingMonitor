import { useState } from "react";
import { FiEdit2, FiPlus, FiSettings, FiBell, FiArrowRight } from "react-icons/fi";

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET) - New York" },
  { value: "America/Chicago", label: "Central Time (CT) - Chicago" },
  { value: "America/Denver", label: "Mountain Time (MT) - Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT) - Los Angeles" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST) - Kolkata" },
  { value: "Asia/Singapore", label: "Singapore Standard Time (SGT)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST) - Tokyo" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET) - Sydney" },
];

export default function MonitorFormModal({
  monitor,
  onClose,
  onSubmit,
  loading,
}) {
  const [activeTab, setActiveTab] = useState("general");
  const [monitorDraft, setMonitorDraft] = useState({
    name: monitor?.name ?? "",
    url: monitor?.url ?? "",
    interval: monitor?.interval ?? 10,
    timezone: monitor?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
    alertChannels: {
      email: monitor?.alertChannels?.email ?? true,
      webhook: monitor?.alertChannels?.webhook ?? false,
      inApp: monitor?.alertChannels?.inApp ?? true,
    },
    webhookUrl: monitor?.webhookUrl ?? "",
    escalationEmails: monitor?.escalationEmails?.join(", ") ?? "",
    retryLimit: monitor?.retryLimit ?? 1,
    latencyThreshold: monitor?.latencyThreshold ?? 2000,
    alertCooldown: monitor?.alertCooldown ?? 30,
    quietHours: {
      enabled: monitor?.quietHours?.enabled ?? false,
      start: monitor?.quietHours?.start ?? "22:00",
      end: monitor?.quietHours?.end ?? "08:00",
    },
    notifyOnRecovery: monitor?.notifyOnRecovery ?? true,
    recoveryAlertDelay: monitor?.recoveryAlertDelay ?? 0,
  });
  const [validationErr, setValidationErr] = useState("");

  const isEdit = !!monitor;

  const updateDraftField = (e) => {
    const { name, value } = e.target;
    setMonitorDraft((prevDraft) => ({ ...prevDraft, [name]: value }));
    setValidationErr("");
  };

  const updateChannelField = (channelName, checked) => {
    setMonitorDraft((prev) => ({
      ...prev,
      alertChannels: {
        ...prev.alertChannels,
        [channelName]: checked,
      },
    }));
    setValidationErr("");
  };

  const updateQuietHoursField = (field, value) => {
    setMonitorDraft((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [field]: value,
      },
    }));
    setValidationErr("");
  };

  const submitMonitorPayload = async () => {
    const {
      name,
      url,
      interval,
      timezone,
      alertChannels,
      webhookUrl,
      escalationEmails,
      retryLimit,
      latencyThreshold,
      alertCooldown,
      quietHours,
      notifyOnRecovery,
      recoveryAlertDelay,
    } = monitorDraft;

    if (!name.trim() || !url.trim()) {
      setValidationErr("Name and URL are required");
      setActiveTab("general");
      return;
    }

    try {
      new URL(url);
    } catch (err) {
      setValidationErr("Please enter a valid URL (e.g. https://example.com)");
      setActiveTab("general");
      return;
    }

    // Webhook validation
    if (alertChannels.webhook) {
      if (!webhookUrl.trim()) {
        setValidationErr("Webhook URL is required when Webhook Alerts are enabled");
        setActiveTab("alerts");
        return;
      }
      try {
        new URL(webhookUrl);
      } catch (err) {
        setValidationErr("Please enter a valid Webhook URL (e.g. https://hooks.slack.com/...)");
        setActiveTab("alerts");
        return;
      }
    }

    // Email escalation validation
    let escalationEmailsArray = [];
    if (alertChannels.email && escalationEmails.trim()) {
      escalationEmailsArray = escalationEmails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      
      for (const email of escalationEmailsArray) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setValidationErr(`"${email}" is not a valid email address`);
          setActiveTab("alerts");
          return;
        }
      }
    }

    await onSubmit({
      name: name.trim(),
      url: url.trim(),
      interval: Number(interval),
      timezone,
      alertChannels,
      webhookUrl: alertChannels.webhook ? webhookUrl.trim() : "",
      escalationEmails: escalationEmailsArray,
      retryLimit: Number(retryLimit),
      latencyThreshold: Number(latencyThreshold),
      alertCooldown: Number(alertCooldown),
      quietHours,
      notifyOnRecovery: !!notifyOnRecovery,
      recoveryAlertDelay: Number(recoveryAlertDelay),
    });
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "560px" }}>
        <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isEdit ? <><FiEdit2 size={18} /> Edit Monitor Settings</> : <><FiPlus size={20} /> New Monitor</>}
        </h2>

        {/* Tab Selector */}
        <div className="modal-tabs">
          <button
            className={`modal-tab-btn ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
            style={{ border: "none" }}
          >
            <FiSettings size={14} /> General Settings
          </button>
          <button
            className={`modal-tab-btn ${activeTab === "alerts" ? "active" : ""}`}
            onClick={() => setActiveTab("alerts")}
            style={{ border: "none" }}
          >
            <FiBell size={14} /> Alerting
          </button>
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          minHeight: "280px",
          maxHeight: "58vh",
          overflowY: "auto",
          paddingRight: "8px"
        }}>
          {activeTab === "general" ? (
            <>
              <div className="form-group">
                <label className="form-label">Monitor Name</label>
                <input
                  className="form-input"
                  name="name"
                  placeholder="My Production API"
                  value={monitorDraft.name}
                  onChange={updateDraftField}
                />
              </div>

              <div className="form-group">
                <label className="form-label">URL to Monitor</label>
                <input
                  className="form-input"
                  name="url"
                  placeholder="https://api.myapp.com/health"
                  value={monitorDraft.url}
                  onChange={updateDraftField}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Check Interval (minutes)</label>
                  <input
                    className="form-input"
                    name="interval"
                    type="number"
                    min="1"
                    max="60"
                    value={monitorDraft.interval}
                    onChange={updateDraftField}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <select
                    className="form-input"
                    name="timezone"
                    value={monitorDraft.timezone}
                    onChange={updateDraftField}
                    style={{ backgroundPosition: "right 12px center" }}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Alert Channels checkboxes */}
              <div className="form-group">
                <label className="form-label">Notification Channels</label>
                <div className="alert-channels-grid">
                  {/* Email Channel */}
                  <div
                    className={`channel-card ${monitorDraft.alertChannels.email ? "active" : ""}`}
                    onClick={() => updateChannelField("email", !monitorDraft.alertChannels.email)}
                  >
                    <input
                      type="checkbox"
                      className="channel-checkbox"
                      checked={monitorDraft.alertChannels.email}
                      readOnly
                    />
                    <div className="channel-info">
                      <span className="channel-name">Email Notifications</span>
                      <span className="channel-desc">
                        Get failure alerts & recovery emails
                      </span>
                    </div>
                  </div>

                  {/* In-App Channel */}
                  <div
                    className={`channel-card ${monitorDraft.alertChannels.inApp ? "active" : ""}`}
                    onClick={() => updateChannelField("inApp", !monitorDraft.alertChannels.inApp)}
                  >
                    <input
                      type="checkbox"
                      className="channel-checkbox"
                      checked={monitorDraft.alertChannels.inApp}
                      readOnly
                    />
                    <div className="channel-info">
                      <span className="channel-name">In-App Notifications</span>
                      <span className="channel-desc">
                        Deliver logs directly into your notification feed
                      </span>
                    </div>
                  </div>

                  {/* Webhook Channel */}
                  <div
                    className={`channel-card ${monitorDraft.alertChannels.webhook ? "active" : ""}`}
                    onClick={() => updateChannelField("webhook", !monitorDraft.alertChannels.webhook)}
                  >
                    <input
                      type="checkbox"
                      className="channel-checkbox"
                      checked={monitorDraft.alertChannels.webhook}
                      readOnly
                    />
                    <div className="channel-info">
                      <span className="channel-name">Webhook Integration</span>
                      <span className="channel-desc">
                        POST custom event bodies to external services
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Webhook URL configuration */}
              {monitorDraft.alertChannels.webhook && (
                <div className="form-group" style={{ animation: "fadeIn 0.2s ease" }}>
                  <label className="form-label">Webhook URL</label>
                  <input
                    className="form-input"
                    name="webhookUrl"
                    placeholder="https://hooks.slack.com/services/..."
                    value={monitorDraft.webhookUrl}
                    onChange={updateDraftField}
                  />
                </div>
              )}

              {/* Escalation Emails */}
              {monitorDraft.alertChannels.email && (
                <div className="form-group" style={{ animation: "fadeIn 0.2s ease" }}>
                  <label className="form-label">Escalation Recipient Emails</label>
                  <input
                    className="form-input"
                    name="escalationEmails"
                    placeholder="devops@myorg.com, emergency@myorg.com"
                    value={monitorDraft.escalationEmails}
                    onChange={updateDraftField}
                  />
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Secondary emails to receive incident reports (comma separated).
                  </span>
                </div>
              )}

              {/* Retry & Latency settings row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Retry Limit</label>
                  <select
                    className="form-input"
                    name="retryLimit"
                    value={monitorDraft.retryLimit}
                    onChange={updateDraftField}
                  >
                    <option value="1">Immediate Alert (1 fail)</option>
                    <option value="2">2 consecutive failures</option>
                    <option value="3">3 consecutive failures</option>
                    <option value="5">5 consecutive failures</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Latency Alert Threshold (ms)</label>
                  <input
                    className="form-input"
                    name="latencyThreshold"
                    type="number"
                    step="100"
                    min="200"
                    max="10000"
                    value={monitorDraft.latencyThreshold}
                    onChange={updateDraftField}
                  />
                </div>
              </div>

              {/* Alert Cooldown dropdown */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Deduplication Cooldown</label>
                  <select
                    className="form-input"
                    name="alertCooldown"
                    value={monitorDraft.alertCooldown}
                    onChange={updateDraftField}
                  >
                    <option value="5">5 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>

                {/* DND Toggle Switch & times */}
                <div className="form-group">
                  <label className="form-label">Quiet Hours (DND)</label>
                  <div className="quiet-hours-group">
                    <div className="quiet-hours-header">
                      <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>Mute during Quiet hours</span>
                      <label className="switch-label">
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={monitorDraft.quietHours.enabled}
                          onChange={(e) => updateQuietHoursField("enabled", e.target.checked)}
                        />
                        <span className="switch-slider" />
                      </label>
                    </div>

                    {monitorDraft.quietHours.enabled && (
                      <div className="quiet-hours-times">
                        <input
                          type="time"
                          className="time-input"
                          value={monitorDraft.quietHours.start}
                          onChange={(e) => updateQuietHoursField("start", e.target.value)}
                        />
                        <span className="time-connector" style={{ display: "inline-flex", alignItems: "center" }}><FiArrowRight /></span>
                        <input
                          type="time"
                          className="time-input"
                          value={monitorDraft.quietHours.end}
                          onChange={(e) => updateQuietHoursField("end", e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recovery Alerts Row */}
              <div className="form-row" style={{ marginTop: "12px", animation: "fadeIn 0.2s ease" }}>
                <div className="form-group">
                  <label className="form-label">Recovery Alerts</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "42px" }}>
                    <label className="switch-label">
                      <input
                        type="checkbox"
                        className="switch-input"
                        checked={monitorDraft.notifyOnRecovery}
                        onChange={(e) => setMonitorDraft(prev => ({ ...prev, notifyOnRecovery: e.target.checked }))}
                      />
                      <span className="switch-slider" />
                    </label>
                    <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                      Notify when service recovers
                    </span>
                  </div>
                </div>

                {monitorDraft.notifyOnRecovery ? (
                  <div className="form-group" style={{ animation: "fadeIn 0.2s ease" }}>
                    <label className="form-label">Recovery Alert Delay (minutes)</label>
                    <input
                      className="form-input"
                      name="recoveryAlertDelay"
                      type="number"
                      min="0"
                      max="60"
                      value={monitorDraft.recoveryAlertDelay}
                      onChange={updateDraftField}
                    />
                  </div>
                ) : (
                  <div className="form-group" />
                )}
              </div>
            </>
          )}

          {validationErr && (
            <div className="alert alert-error" style={{ fontSize: "12px", marginTop: "8px" }}>{validationErr}</div>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submitMonitorPayload}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> Saving...
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Monitor"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
