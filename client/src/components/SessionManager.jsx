import React, { useState } from "react";
import { useSessions } from "../hook/useSessions";
import { SectionCard, ConfirmModal } from "./UserProfile";
import { 
  FiMonitor, 
  FiSmartphone, 
  FiTablet, 
  FiCpu, 
  FiGlobe, 
  FiCompass, 
  FiClock, 
  FiMapPin, 
  FiActivity, 
  FiRefreshCw, 
  FiShield, 
  FiLogOut,
  FiAlertCircle,
  FiCheckCircle
} from "react-icons/fi";

const getDeviceIcon = (deviceStr = "", osStr = "") => {
  const d = deviceStr.toLowerCase();
  const o = osStr.toLowerCase();
  
  if (d.includes("iphone") || d.includes("phone") || o.includes("ios") || o.includes("android")) {
    return <FiSmartphone size={18} />;
  }
  if (d.includes("ipad") || d.includes("tablet")) {
    return <FiTablet size={18} />;
  }
  if (d.includes("mac") || d.includes("windows") || d.includes("linux") || o.includes("mac") || o.includes("windows") || o.includes("linux")) {
    return <FiMonitor size={18} />;
  }
  return <FiCpu size={18} />;
};

const getBrowserIcon = (browserStr = "") => {
  const b = browserStr.toLowerCase();
  if (b.includes("safari") && !b.includes("chrome") && !b.includes("android")) {
    return <FiCompass size={18} />;
  }
  return <FiGlobe size={18} />;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

export default function SessionManager() {
  const { 
    currentSession, 
    otherActiveSessions, 
    sessionHistory, 
    loading, 
    refresh, 
    revokeSession, 
    revokeOtherSessions, 
    revokeCurrentSession 
  } = useSessions();

  // Modal States
  const [currentRevokingId, setCurrentRevokingId] = useState(null);
  const [confirmRevokeOthersOpen, setConfirmRevokeOthersOpen] = useState(false);
  const [confirmRevokeCurrentOpen, setConfirmRevokeCurrentOpen] = useState(false);

  const handleRevokeSingle = async () => {
    if (currentRevokingId) {
      await revokeSession(currentRevokingId);
      setCurrentRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    await revokeOtherSessions();
    setConfirmRevokeOthersOpen(false);
  };

  const handleRevokeCurrent = async () => {
    await revokeCurrentSession();
    setConfirmRevokeCurrentOpen(false);
  };

  return (
    <div className="sessions-manager-container">
      <div className="sessions-header-controls">
        <h3 className="sessions-inner-title">Active Login Sessions</h3>
        <button 
          className="btn btn-ghost btn-sm btn-icon-only refresh-sessions-btn" 
          onClick={refresh} 
          disabled={loading}
          title="Refresh Session List"
        >
          <FiRefreshCw className={loading ? "spinner-anim" : ""} size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <SectionCard 
        title="Current Session" 
        subtitle="This is the session you are currently using to access PingMonitor."
        icon={<FiShield style={{ color: "var(--green)" }} />}
      >
        {currentSession ? (
          <div className="current-session-card">
            <div className="session-item-row">
              <div className="session-item-icon-wrapper current">
                {getDeviceIcon(currentSession.device, currentSession.operatingSystem)}
              </div>
              <div className="session-item-info">
                <div className="session-item-title-row">
                  <h4 className="session-device-name">
                    {currentSession.operatingSystem} ({currentSession.device})
                    <span className="badge badge-success current-badge">Current Session</span>
                  </h4>
                </div>
                <div className="session-details-grid">
                  <div className="session-detail-item">
                    <FiGlobe size={13} className="detail-icon" />
                    <span>{currentSession.browser}</span>
                  </div>
                  <div className="session-detail-item">
                    <FiActivity size={13} className="detail-icon" />
                    <span>IP: {currentSession.ipAddress}</span>
                  </div>
                  <div className="session-detail-item">
                    <FiMapPin size={13} className="detail-icon" />
                    <span>{currentSession.location}</span>
                  </div>
                  <div className="session-detail-item">
                    <FiClock size={13} className="detail-icon" />
                    <span>Logged in: {formatDate(currentSession.loginAt)}</span>
                  </div>
                </div>
              </div>
              <div className="session-action-side">
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={() => setConfirmRevokeCurrentOpen(true)}
                  disabled={loading}
                >
                  <FiLogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="sessions-empty-state">
            <FiAlertCircle size={24} />
            <p>Loading current session details...</p>
          </div>
        )}
      </SectionCard>

      <SectionCard 
        title="Other Active Sessions" 
        subtitle="Sessions currently active on other devices or browsers."
        icon={<FiMonitor />}
      >
        <div className="other-sessions-header">
          {otherActiveSessions.length > 0 && (
            <button 
              className="btn btn-danger btn-sm sign-out-all-btn"
              onClick={() => setConfirmRevokeOthersOpen(true)}
              disabled={loading}
            >
              Sign Out All Other Sessions
            </button>
          )}
        </div>

        {otherActiveSessions.length > 0 ? (
          <div className="other-sessions-list">
            {otherActiveSessions.map((session) => (
              <div className="session-item-row other-session-item" key={session.id}>
                <div className="session-item-icon-wrapper">
                  {getDeviceIcon(session.device, session.operatingSystem)}
                </div>
                <div className="session-item-info">
                  <h4 className="session-device-name">
                    {session.operatingSystem} ({session.device})
                  </h4>
                  <div className="session-details-grid">
                    <div className="session-detail-item">
                      <FiGlobe size={13} className="detail-icon" />
                      <span>{session.browser}</span>
                    </div>
                    <div className="session-detail-item">
                      <FiActivity size={13} className="detail-icon" />
                      <span>IP: {session.ipAddress}</span>
                    </div>
                    <div className="session-detail-item">
                      <FiMapPin size={13} className="detail-icon" />
                      <span>{session.location}</span>
                    </div>
                    <div className="session-detail-item">
                      <FiClock size={13} className="detail-icon" />
                      <span>Last active: {formatDate(session.lastActivity)}</span>
                    </div>
                  </div>
                </div>
                <div className="session-action-side">
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentRevokingId(session.id)}
                    disabled={loading}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="sessions-empty-state card-empty">
            <FiCheckCircle size={20} style={{ color: "var(--green)" }} />
            <p>No other active sessions detected.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard 
        title="Session History" 
        subtitle="Last 20 login sessions logged on this account."
        icon={<FiClock />}
      >
        {sessionHistory.length > 0 ? (
          <div className="sessions-table-wrapper">
            <table className="sessions-history-table">
              <thead>
                <tr>
                  <th>Device / Browser</th>
                  <th>IP & Location</th>
                  <th>Login Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessionHistory.map((session) => {
                  const isCurrent = session.isCurrent;
                  
                  let statusClass = "badge-muted";
                  if (session.status === "active") statusClass = "badge-success";
                  else if (session.status === "logged_out") statusClass = "badge-info";
                  else if (session.status === "expired") statusClass = "badge-warning";
                  else if (session.status === "revoked") statusClass = "badge-danger";

                  const statusLabels = {
                    active: "Active",
                    logged_out: "Logged Out",
                    expired: "Expired",
                    revoked: "Revoked"
                  };

                  return (
                    <tr key={session.id} className={isCurrent ? "history-current-row" : ""}>
                      <td>
                        <div className="table-device-cell">
                          <span className="table-device-icon">
                            {getDeviceIcon(session.device, session.operatingSystem)}
                          </span>
                          <div className="table-device-info">
                            <span className="table-device-name">
                              {session.operatingSystem || "Unknown OS"}
                            </span>
                            <span className="table-browser-name">
                              {session.browser || "Unknown Browser"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="table-location-info">
                          <span className="table-ip">{session.ipAddress}</span>
                          <span className="table-loc">{session.location}</span>
                        </div>
                      </td>
                      <td>
                        <span className="table-time-text">
                          {formatDate(session.loginAt)}
                        </span>
                      </td>
                      <td>
                        <span className="table-duration-text">
                          {session.duration}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {statusLabels[session.status] || session.status}
                        </span>
                      </td>
                      <td>
                        {session.status === "active" ? (
                          isCurrent ? (
                            <button 
                              className="btn btn-ghost btn-xs text-danger"
                              onClick={() => setConfirmRevokeCurrentOpen(true)}
                              disabled={loading}
                            >
                              Sign Out
                            </button>
                          ) : (
                            <button 
                              className="btn btn-ghost btn-xs"
                              onClick={() => setCurrentRevokingId(session.id)}
                              disabled={loading}
                            >
                              Sign Out
                            </button>
                          )
                        ) : (
                          <span className="history-terminated-text">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sessions-empty-state">
            <p>No login history logged yet.</p>
          </div>
        )}
      </SectionCard>

      <ConfirmModal
        isOpen={currentRevokingId !== null}
        title="Sign out of this session?"
        message="This device will be immediately signed out of your account, and any active tasks running in this session will need authentication."
        confirmLabel="Yes, Sign Out"
        onConfirm={handleRevokeSingle}
        onCancel={() => setCurrentRevokingId(null)}
        danger
      />

      <ConfirmModal
        isOpen={confirmRevokeOthersOpen}
        title="Sign out all other sessions?"
        message="This will terminate all active login sessions on other devices and browsers. You will remain logged in on this current device."
        confirmLabel="Sign Out Others"
        onConfirm={handleRevokeOthers}
        onCancel={() => setConfirmRevokeOthersOpen(false)}
        danger
      />

      <ConfirmModal
        isOpen={confirmRevokeCurrentOpen}
        title="Sign out of current session?"
        message="You will be signed out of PingMonitor on this device. You will need to log in again to access your monitors and settings."
        confirmLabel="Yes, Sign Out"
        onConfirm={handleRevokeCurrent}
        onCancel={() => setConfirmRevokeCurrentOpen(false)}
        danger
      />
    </div>
  );
}
