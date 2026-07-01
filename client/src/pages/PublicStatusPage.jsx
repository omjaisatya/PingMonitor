import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../api/axios";
import "../styles/StatusPage.css";
import AppName from "../AppName";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiActivity,
  FiAlertCircle,
  FiExternalLink,
  FiMail,
  FiX,
  FiLock,
  FiChevronRight
} from "react-icons/fi";
import { MarkdownBlock } from "../utils/markdown";
import SubscribeModal from "../components/SubscribeModal";
import { useWebSocket } from "../hook/useWebSocket";

const StatusSkeleton = () => (
  <div className="status-page-container">
    <div className="status-header" style={{ opacity: 0.4 }}>
      <div
        className="skeleton-title"
        style={{
          width: "120px",
          height: "24px",
          margin: "0 auto 12px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "4px",
        }}
      ></div>
      <div
        className="skeleton-title"
        style={{
          width: "280px",
          height: "34px",
          margin: "0 auto 8px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "6px",
        }}
      ></div>
      <div
        className="skeleton-text"
        style={{
          width: "210px",
          height: "14px",
          margin: "0 auto",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "4px",
        }}
      ></div>
    </div>
    <div
      className="system-status-banner"
      style={{
        height: "64px",
        width: "100%",
        maxWidth: "800px",
        marginBottom: "24px",
        background: "rgba(255,255,255,0.03)",
      }}
    ></div>
    <div
      className="status-card"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <div
        style={{
          width: "140px",
          height: "20px",
          marginBottom: "24px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "4px",
        }}
      ></div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 0",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div>
            <div
              style={{
                width: "110px",
                height: "16px",
                marginBottom: "8px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "4px",
              }}
            ></div>
            <div
              style={{
                width: "160px",
                height: "12px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: "4px",
              }}
            ></div>
          </div>
          <div
            style={{
              width: "140px",
              height: "24px",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "4px",
            }}
          ></div>
        </div>
      ))}
    </div>
  </div>
);

export default function PublicStatusPage({ slugOrUserId: propSlug, isCustomDomain = false }) {
  const params = useParams();
  const slugOrUserId = propSlug || params.slugOrUserId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(null);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordPageMeta, setPasswordPageMeta] = useState(null);

  const query = new URLSearchParams(window.location.search);
  const isEmbed = query.get("embed") === "true";
  const isVerifiedParam = query.get("verified") === "true";

  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [verifiedBanner, setVerifiedBanner] = useState(isVerifiedParam);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem(`status_page_token_${slugOrUserId}`);
      const headers = {};
      if (token) {
        headers["x-status-page-token"] = token;
      }

      const response = await apiClient.get(`/public/status/${slugOrUserId}`, { headers });
      setData(response.data);
      setError(null);
      setPasswordRequired(false);
    } catch (err) {
      console.error("Public status fetch error:", err);
      if (err.response?.status === 401 && err.response?.data?.isPasswordProtected) {
        setPasswordRequired(true);
        setPasswordPageMeta(err.response.data);
      } else {
        setError(err.response?.data?.message || "Failed to load status page");
      }
    } finally {
      setLoading(false);
    }
  }, [slugOrUserId]);

  useEffect(() => {
    if (slugOrUserId) {
      fetchStatus();
    }
  }, [slugOrUserId, fetchStatus]);

  useWebSocket(() => {
    console.log("[WS Status Page] Refreshing status due to realtime event...");
    fetchStatus();
  }, slugOrUserId);

  useEffect(() => {
    if (data) {
      document.title = data.title || "System Status";

      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", data.description || "Live status of our services.");

      if (data.favicon) {
        let linkFavicon = document.querySelector('link[rel="icon"]');
        if (!linkFavicon) {
          linkFavicon = document.createElement("link");
          linkFavicon.setAttribute("rel", "icon");
          document.head.appendChild(linkFavicon);
        }
        linkFavicon.setAttribute("href", data.favicon);
      }
    }
  }, [data]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSubmittingPassword(true);
    setAuthError(null);
    try {
      const res = await apiClient.post(`/public/status/auth/${slugOrUserId}`, { password });
      localStorage.setItem(`status_page_token_${slugOrUserId}`, res.data.token);
      setPasswordRequired(false);
      fetchStatus();
    } catch (err) {
      setAuthError(err.response?.data?.message || "Invalid password");
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (loading) return <StatusSkeleton />;

  if (passwordRequired) {
    const metaColors = passwordPageMeta?.colors;
    const metaTitle = passwordPageMeta?.title || "System Status";
    const metaLogo = passwordPageMeta?.logo;

    const brandVariables = metaColors ? `
      :root, .password-page-wrapper {
        --primary: ${metaColors.primary} !important;
        --bg-primary: ${metaColors.background} !important;
        --bg-secondary: ${metaColors.cardBackground} !important;
        --text-primary: ${metaColors.text} !important;
        --text-muted: ${metaColors.textMuted} !important;
      }
      body {
        background-color: ${metaColors.background} !important;
      }
    ` : "";

    return (
      <div className="password-page-wrapper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        {brandVariables && <style>{brandVariables}</style>}
        <div className="status-card" style={{ width: "100%", maxWidth: "420px", padding: "32px", textAlign: "center", borderRadius: "16px" }}>
          {metaLogo ? (
            <img src={metaLogo} alt="Logo" style={{ maxHeight: "48px", marginBottom: "24px" }} />
          ) : (
            <div className="status-header__logo" style={{ marginBottom: "24px" }}>{AppName}</div>
          )}
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Password Required</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
            The status page for <strong>{metaTitle}</strong> is private.
          </p>

          <form onSubmit={handlePasswordSubmit}>
            <div style={{ position: "relative", marginBottom: "20px" }}>
              <FiLock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 40px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
                required
              />
            </div>
            {authError && (
              <p style={{ color: "var(--red)", fontSize: "13px", marginTop: "-12px", marginBottom: "16px", textAlign: "left" }}>
                {authError}
              </p>
            )}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={submittingPassword}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {submittingPassword ? "Verifying..." : "Access Status Page"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-page-container">
        <div className="status-error-card">
          <FiAlertCircle className="status-error-card__icon" />
          <h2 className="status-error-card__title">Status Page Unavailable</h2>
          <p className="status-error-card__desc">{error}</p>
        </div>
      </div>
    );
  }

  const {
    title,
    description,
    systemStatus,
    monitors,
    incidents = [],
    maintenanceWindows = [],
    candlePeriod = "minutes",
    colors,
    logo,
    customCSS,
    template = "classic",
  } = data;

  const brandCSS = colors ? `
    :root, .status-page-container {
      --green: #10b981 !important;
      --red: #ef4444 !important;
      --yellow: #f59e0b !important;
      --primary: ${colors.primary} !important;
      --bg-primary: ${colors.background} !important;
      --bg-secondary: ${colors.cardBackground} !important;
      --text-primary: ${colors.text} !important;
      --text-muted: ${colors.textMuted} !important;
      --card-bg: ${colors.cardBackground} !important;
      --border-color: rgba(255, 255, 255, 0.06) !important;
    }
    body {
      background-color: ${colors.background} !important;
      color: ${colors.text} !important;
    }
    
    /* Grid Template Styles */
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .status-grid-card {
      background: var(--bg-secondary, #13131c);
      border: 1px solid var(--border-color, rgba(255,255,255,0.06));
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .status-grid-card__header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .status-grid-card__name {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .status-grid-card__url {
      font-size: 12px;
      color: var(--text-muted);
      text-decoration: none;
      display: block;
      margin-bottom: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .status-grid-card__status-text {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
    }
    
    /* Minimal Template Styles */
    .status-minimal {
      background: var(--bg-secondary, #13131c);
      border: 1px solid var(--border-color, rgba(255,255,255,0.06));
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .status-minimal-services {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .status-minimal-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: 500;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .status-minimal-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .status-text-badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .status-text-badge.up {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }
    .status-text-badge.down {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }
  ` : "";

  const renderStatusBanner = () => {
    const bannerConfig = {
      all_operational: {
        class: "all_operational",
        label: "All Systems Operational",
      },
      partial_outage: {
        class: "partial_outage",
        label: "Partial System Outage",
      },
      major_outage: { class: "major_outage", label: "Major System Outage" },
    };

    const currentBanner = bannerConfig[systemStatus] || {
      class: "unknown",
      label: "System Status Unknown",
    };

    return (
      <div className={`system-status-banner ${currentBanner.class}`}>
        <span className="status-pulse-ring" />
        <span className="system-status-banner__text">
          {currentBanner.label}
        </span>
      </div>
    );
  };

  const getBarTooltipText = (bar, candlePeriod) => {
    if (bar.isEmpty) return "";
    let dateStr = "";
    if (candlePeriod === "day") {
      dateStr = new Date(bar.timestamp).toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } else if (candlePeriod === "month") {
      dateStr = new Date(bar.timestamp).toLocaleDateString([], {
        year: "numeric",
        month: "long",
      });
    } else {
      dateStr =
        new Date(bar.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }) +
        " " +
        new Date(bar.timestamp).toLocaleDateString([], {
          month: "short",
          day: "numeric",
        });
    }

    const statusLabel = bar.status.toUpperCase();
    const codeLabel = bar.statusCode ? ` (${bar.statusCode})` : "";
    const latencyLabel =
      bar.responseTime !== null ? ` - ${bar.responseTime}ms` : "";

    return `${dateStr} • ${statusLabel}${codeLabel}${latencyLabel}`;
  };

  const renderMonitorBars = (recentLogs) => {
    const maxBars = 15;
    const totalLogs = recentLogs.length;
    const emptyCount = Math.max(0, maxBars - totalLogs);

    const bars = [];
    for (let i = 0; i < emptyCount; i++) {
      bars.push({ isEmpty: true, key: `empty-${i}` });
    }

    recentLogs.forEach((log, index) => {
      bars.push({
        isEmpty: false,
        status: log.status,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        timestamp: log.timestamp,
        key: log._id || index,
      });
    });

    return (
      <div className="uptime-history">
        {bars.map((bar) => {
          const isUp = bar.status === "up";
          const barClass = bar.isEmpty
            ? "uptime-bar empty"
            : isUp
              ? "uptime-bar up"
              : "uptime-bar down";

          return (
            <div
              key={bar.key}
              className={`uptime-bar-wrapper ${bar.isEmpty ? "is-empty" : ""}`}
            >
              <div className={barClass} />
              {!bar.isEmpty && (
                <div className="uptime-tooltip">
                  <div className="tooltip-time">
                    {candlePeriod === "month"
                      ? new Date(bar.timestamp).toLocaleDateString([], { year: "numeric", month: "long" })
                      : candlePeriod === "day"
                        ? new Date(bar.timestamp).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
                        : new Date(bar.timestamp).toLocaleDateString()}
                  </div>
                  <div className={`tooltip-status ${isUp ? "up" : "down"}`}>
                    {getBarTooltipText(bar, candlePeriod)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderClassicTemplate = () => (
    <div className="status-card">
      {!isEmbed && <h2 className="status-card__header">Services Status</h2>}
      {monitors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
          No active services found on this status page.
        </div>
      ) : (
        monitors.map((monitor) => (
          <div key={monitor._id} className="status-monitor-row">
            <div className="status-monitor-row__info">
              <div className="status-monitor-row__name">
                <span className={`status-dot ${monitor.status || "unknown"}`} />
                {monitor.name}
              </div>
              {monitor.url && (
                <a href={monitor.url} target="_blank" rel="noreferrer" className="status-monitor-row__url">
                  {monitor.url}
                  <FiExternalLink size={11} style={{ marginLeft: "4px" }} />
                </a>
              )}
            </div>

            <div className="status-monitor-row__history">
              {renderMonitorBars(monitor.recentLogs || [])}
              <div className={`status-monitor-row__badge ${monitor.status || "unknown"}`}>
                {(monitor.status || "unknown").toUpperCase()}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderGridTemplate = () => (
    <div className="status-grid">
      {monitors.length === 0 ? (
        <div className="status-card" style={{ gridColumn: "1/-1", textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
          No active services found on this status page.
        </div>
      ) : (
        monitors.map((monitor) => (
          <div key={monitor._id} className="status-grid-card">
            <div className="status-grid-card__header">
              <span className={`status-dot ${monitor.status || "unknown"}`} />
              <h3 className="status-grid-card__name">{monitor.name}</h3>
            </div>
            {monitor.url && (
              <a href={monitor.url} target="_blank" rel="noreferrer" className="status-grid-card__url">
                {monitor.url}
              </a>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
              <span className="status-grid-card__status-text">
                {(monitor.status || "unknown").toUpperCase()}
              </span>
              {renderMonitorBars(monitor.recentLogs || [])}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderMinimalTemplate = () => (
    <div className="status-minimal">
      {monitors.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
          No active services found on this status page.
        </div>
      ) : (
        <div className="status-minimal-services">
          {monitors.map((monitor) => (
            <div key={monitor._id} className="status-minimal-row">
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{monitor.name}</span>
              <span className={`status-text-badge ${monitor.status || "unknown"}`}>
                {(monitor.status || "unknown").toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`status-page-container ${isEmbed ? "embed-mode" : ""}`}>
      {brandCSS && <style>{brandCSS}</style>}
      {customCSS && <style>{customCSS}</style>}

      {!isEmbed && (
        <header className="status-header">
          {logo ? (
            <img src={logo} alt="Logo" className="status-header__logo-img" style={{ maxHeight: "48px", marginBottom: "16px" }} />
          ) : (
            <div className="status-header__logo">{AppName}</div>
          )}
          <h1 className="status-header__title">{title}</h1>
          <p className="status-header__desc">{description}</p>
          <div style={{ marginTop: "16px" }}>
            <button
              className="btn btn-outline"
              onClick={() => setIsSubscribeOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", margin: "0 auto" }}
            >
              <FiMail /> Subscribe to Updates
            </button>
          </div>
        </header>
      )}

      {verifiedBanner && (
        <div
          className="system-status-banner all_operational"
          style={{
            marginBottom: "24px",
            width: "100%",
            maxWidth: "800px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <FiCheckCircle size={20} color="var(--green)" />
            <span style={{ fontWeight: 600 }}>Your subscription has been verified successfully!</span>
          </div>
          <button
            onClick={() => setVerifiedBanner(false)}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {renderStatusBanner()}

      {!isEmbed && maintenanceWindows.length > 0 && (
        <div className="status-card" style={{ padding: "16px", marginBottom: "24px", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
          <h2 className="status-card__header" style={{ color: "#3b82f6", display: "flex", alignItems: "center", gap: "8px", borderBottom: "none", paddingBottom: 0, marginBottom: "12px" }}>
            <FiActivity /> Scheduled Maintenance
          </h2>
          {maintenanceWindows.map((win) => (
            <div key={win._id} style={{ marginBottom: "12px", background: "rgba(255, 255, 255, 0.03)", padding: "12px", borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontSize: "16px" }}>{win.title}</strong>
                <span className={`status-incident-row__badge ${win.status === "active" ? "investigating" : "resolved"}`}>
                  {win.status.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: "0 0 8px 0", color: "var(--text-muted)", fontSize: "14px" }}>{win.description}</p>
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {new Date(win.startTime).toLocaleString()} - {new Date(win.endTime).toLocaleString()} ({win.timezone})
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Render selected layout template */}
      {template === "grid" ? (
        renderGridTemplate()
      ) : template === "minimal" ? (
        renderMinimalTemplate()
      ) : (
        renderClassicTemplate()
      )}

      {!isEmbed && (
        <div className="status-card">
          <h2 className="status-card__header">Incident History</h2>
          {incidents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                color: "var(--text-muted)",
              }}
            >
              No public incidents reported.
            </div>
          ) : (
            incidents.map((incident) => (
              <article key={incident._id} className="status-incident-row">
                <div className="status-incident-row__header">
                  <div>
                    <h3>{incident.title}</h3>
                    <p className="status-incident-row__meta">
                      {incident.severity} ·{" "}
                      {new Date(incident.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`status-incident-row__badge ${incident.state}`}
                  >
                    {incident.state}
                  </span>
                </div>
                {incident.summary && <MarkdownBlock value={incident.summary} />}

                {incident.affectedServices?.length > 0 && (
                  <div className="status-incident-row__services">
                    {incident.affectedServices.map((service) => (
                      <span key={service.monitorId || service.name}>
                        {service.name}
                      </span>
                    ))}
                  </div>
                )}

                {incident.timeline?.length > 0 && (
                  <div className="status-incident-row__timeline">
                    {incident.timeline.slice(-3).map((item, idx) => (
                      <div
                        key={item._id || idx}
                        className={`status-incident-row__timeline-item ${incident.state}`}
                      >
                        <strong>
                          {item.type ? item.type.replace(/_/g, " ") : "Update"}
                        </strong>
                        <span>{item.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {!isEmbed && (
        <footer className="status-footer">
          <div>
            Powered by{" "}
            <a href="/" className="status-footer__link">
              {AppName}
            </a>
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
            Refreshes automatically via live monitors
          </div>
        </footer>
      )}

      {isEmbed && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            width: "100%",
            maxWidth: "800px",
            marginTop: "12px",
          }}
        >
          <a
            href={`${window.location.origin}/status/${slugOrUserId}`}
            target="_blank"
            rel="noreferrer"
            className="status-footer__link"
            style={{
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              opacity: 0.6,
            }}
          >
            <span>Powered by {AppName}</span>
            <FiExternalLink size={11} />
          </a>
        </div>
      )}

      <SubscribeModal
        isOpen={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
        monitors={monitors}
        slugOrUserId={slugOrUserId}
      />
    </div>
  );
}
