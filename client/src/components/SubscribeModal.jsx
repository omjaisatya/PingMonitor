import { useState } from "react";
import apiClient from "../api/axios";
import {
  FiMail,
  FiMessageSquare,
  FiSend,
  FiSlack,
  FiGlobe,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronRight,
  FiActivity
} from "react-icons/fi";

export default function SubscribeModal({ isOpen, onClose, monitors = [], slugOrUserId }) {
  const [activeTab, setActiveTab] = useState("email");
  const [target, setTarget] = useState("");
  const [digest, setDigest] = useState("none");
  const [subscribeAll, setSubscribeAll] = useState(true);
  const [selectedMonitors, setSelectedMonitors] = useState([]);
  
  const [isPending, setIsPending] = useState(false);
  const [subscriberId, setSubscriberId] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setTarget("");
    setError(null);
  };

  const handleMonitorToggle = (id) => {
    if (selectedMonitors.includes(id)) {
      setSelectedMonitors(selectedMonitors.filter((mId) => mId !== id));
    } else {
      setSelectedMonitors([...selectedMonitors, id]);
    }
  };

  const handleSubscribeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const monitorsList = subscribeAll ? [] : selectedMonitors;

    try {
      const response = await apiClient.post("/public/subscribe", {
        slugOrUserId,
        type: activeTab,
        target,
        monitors: monitorsList,
        digestFrequency: activeTab === "email" ? digest : "none",
      });

      if (response.data.status === "verified") {
        setIsVerified(true);
      } else {
        setSubscriberId(response.data.subscriberId);
        setIsPending(true);
      }
    } catch (err) {
      console.error("Subscription submission failed:", err);
      setError(err.response?.data?.message || "Failed to submit subscription request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post("/public/subscribe/verify-code", {
        subscriberId,
        code: verificationCode,
      });

      setIsVerified(true);
    } catch (err) {
      console.error("Verification code submission failed:", err);
      setError(err.response?.data?.message || "Invalid verification code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderTabs = () => {
    const tabs = [
      { id: "email", label: "Email", icon: FiMail },
      { id: "sms", label: "SMS", icon: FiMessageSquare },
      { id: "telegram", label: "Telegram", icon: FiSend },
      { id: "slack", label: "Slack", icon: FiSlack },
      { id: "webhook", label: "Webhook", icon: FiGlobe },
    ];

    return (
      <div className="subscribe-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`subscribe-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <Icon className="tab-icon" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const getPlaceholder = () => {
    switch (activeTab) {
      case "email":
        return "you@example.com";
      case "sms":
        return "+1 (555) 000-0000";
      case "telegram":
        return "Telegram username or Chat ID";
      case "slack":
        return "https://hooks.slack.com/services/T.../B.../...";
      case "webhook":
        return "https://api.yourdomain.com/status-webhook";
      default:
        return "";
    }
  };

  const getLabel = () => {
    switch (activeTab) {
      case "email":
        return "Email Address";
      case "sms":
        return "Phone Number (with country code)";
      case "telegram":
        return "Telegram chat identifier";
      case "slack":
        return "Slack Incoming Webhook URL";
      case "webhook":
        return "Endpoint URL";
      default:
        return "";
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal subscribe-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="subscribe-modal-header">
          <h2 className="modal-title subscribe-modal-title">
            Subscribe to Updates
          </h2>
          <button className="subscribe-modal-close" onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        {error && (
          <div className="subscribe-error-alert">
            <FiAlertCircle className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {isVerified ? (
          <div className="subscribe-success-step">
            <FiCheckCircle className="success-check-icon animate-pulse" />
            <h3>Subscription Confirmed!</h3>
            <p>You have successfully registered to receive real-time notifications for status changes.</p>
            <button className="btn btn-primary btn-full" onClick={onClose}>
              Dismiss
            </button>
          </div>
        ) : isPending ? (
          <form className="subscribe-verify-form" onSubmit={handleVerifySubmit}>
            <div className="verify-description">
              <p>We've sent a verification code to your configured subscription endpoint: <strong>{target}</strong></p>
              <p className="verify-hint">If Slack or Webhook, check your channel/endpoint payload for the 6-digit verification code.</p>
            </div>
            
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <input
                type="text"
                className="form-input verify-code-input"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                required
                disabled={loading}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsPending(false)}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || verificationCode.length < 6}
              >
                {loading ? <span className="spinner" /> : "Verify Code"}
              </button>
            </div>
          </form>
        ) : (
          <form className="subscribe-form" onSubmit={handleSubscribeSubmit}>
            {renderTabs()}

            <div className="subscribe-form-fields">
              <div className="form-group">
                <label className="form-label">{getLabel()}</label>
                <input
                  type={activeTab === "email" ? "email" : "text"}
                  className="form-input"
                  placeholder={getPlaceholder()}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {activeTab === "email" && (
                <div className="form-group mt-12">
                  <label className="form-label">Uptime Digest Frequency</label>
                  <select
                    className="form-input subscribe-select"
                    value={digest}
                    onChange={(e) => setDigest(e.target.value)}
                    disabled={loading}
                  >
                    <option value="none">No digest (Alerts only)</option>
                    <option value="daily">Daily report digest</option>
                    <option value="weekly">Weekly report digest</option>
                  </select>
                </div>
              )}

              {/* Component specific configuration */}
              <div className="subscribe-component-selection">
                <div className="subscribe-component-header">
                  <label className="subscribe-checkbox-label">
                    <input
                      type="checkbox"
                      checked={subscribeAll}
                      onChange={(e) => setSubscribeAll(e.target.checked)}
                      disabled={loading}
                    />
                    <span>Subscribe to all components</span>
                  </label>
                </div>

                {!subscribeAll && monitors.length > 0 && (
                  <div className="subscribe-monitors-list">
                    <p className="select-monitors-title">Select Components:</p>
                    {monitors.map((monitor) => (
                      <label key={monitor._id} className="subscribe-monitor-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedMonitors.includes(monitor._id)}
                          onChange={() => handleMonitorToggle(monitor._id)}
                          disabled={loading}
                        />
                        <span className="monitor-name-label">
                          <FiActivity size={12} className="mr-6" />
                          {monitor.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !target.trim()}
              >
                {loading ? <span className="spinner" /> : (
                  <>
                    <span>Subscribe</span>
                    <FiChevronRight />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
