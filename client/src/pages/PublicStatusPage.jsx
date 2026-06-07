import { useState, useEffect } from "react";
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
} from "react-icons/fi";
import { MarkdownBlock } from "../utils/markdown";

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

export default function PublicStatusPage() {
  const { slugOrUserId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const query = new URLSearchParams(window.location.search);
  const isEmbed = query.get("embed") === "true";

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/public/status/${slugOrUserId}`);
        setData(response.data);
        setError(null);
      } catch (err) {
        console.error("Public status fetch error:", err);
        setError(err.response?.data?.message || "Failed to load status page");
      } finally {
        setLoading(false);
      }
    };

    if (slugOrUserId) {
      fetchStatus();
    }
  }, [slugOrUserId]);

  if (loading) return <StatusSkeleton />;

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

  const { title, description, systemStatus, monitors, incidents = [] } = data;

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

  const getBarTooltipText = (bar) => {
    if (bar.isEmpty) return "";
    const dateStr =
      new Date(bar.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }) +
      " " +
      new Date(bar.timestamp).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });

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
                    {new Date(bar.timestamp).toLocaleDateString()}
                  </div>
                  <div className={`tooltip-status ${isUp ? "up" : "down"}`}>
                    {getBarTooltipText(bar)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`status-page-container ${isEmbed ? "embed-mode" : ""}`}>
      {!isEmbed && (
        <header className="status-header">
          <div className="status-header__logo">{AppName}</div>
          <h1 className="status-header__title">{title}</h1>
          <p className="status-header__desc">{description}</p>
        </header>
      )}

      {renderStatusBanner()}

      <div className="status-card">
        {!isEmbed && <h2 className="status-card__header">Services Status</h2>}
        {monitors.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "var(--text-muted)",
            }}
          >
            No active services found on this status page.
          </div>
        ) : (
          monitors.map((monitor) => (
            <div key={monitor._id} className="status-monitor-row">
              <div className="status-monitor-row__info">
                <div className="status-monitor-row__name">
                  <span
                    className={`status-dot ${monitor.status || "unknown"}`}
                  />
                  {monitor.name}
                </div>
                <a
                  href={monitor.url}
                  target="_blank"
                  rel="noreferrer"
                  className="status-monitor-row__url"
                >
                  {monitor.url}
                  <FiExternalLink size={11} style={{ marginLeft: "4px" }} />
                </a>
              </div>

              <div className="status-monitor-row__history">
                {renderMonitorBars(monitor.recentLogs || [])}
                <div
                  className={`status-monitor-row__badge ${monitor.status || "unknown"}`}
                >
                  {(monitor.status || "unknown").toUpperCase()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
    </div>
  );
}
