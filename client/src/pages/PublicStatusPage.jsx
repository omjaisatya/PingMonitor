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
    <div className="status-header" style={{ opacity: 0.5 }}>
      <div
        className="status-header__logo skeleton-text"
        style={{ width: "120px", height: "24px", margin: "0 auto 12px" }}
      ></div>
      <div
        className="skeleton-title"
        style={{ width: "300px", height: "36px", margin: "0 auto 8px" }}
      ></div>
      <div
        className="skeleton-text"
        style={{ width: "200px", height: "16px", margin: "0 auto" }}
      ></div>
    </div>
    <div
      className="system-status-banner skeleton"
      style={{
        height: "76px",
        width: "100%",
        maxWidth: "800px",
        marginBottom: "30px",
      }}
    ></div>
    <div className="status-card">
      <div
        className="skeleton-title"
        style={{ width: "150px", height: "22px", marginBottom: "20px" }}
      ></div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "16px 0",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div>
            <div
              className="skeleton-title"
              style={{ width: "120px", height: "18px", marginBottom: "6px" }}
            ></div>
            <div
              className="skeleton-text"
              style={{ width: "180px", height: "12px" }}
            ></div>
          </div>
          <div
            className="skeleton"
            style={{ width: "180px", height: "30px", borderRadius: "4px" }}
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

  if (loading) {
    return <StatusSkeleton />;
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

  const { title, description, systemStatus, monitors, incidents = [] } = data;

  const renderStatusBanner = () => {
    switch (systemStatus) {
      case "all_operational":
        return (
          <div className="system-status-banner all_operational">
            <span className="status-pulse-ring" />
            <span className="system-status-banner__text">
              All Systems Operational
            </span>
          </div>
        );
      case "partial_outage":
        return (
          <div className="system-status-banner partial_outage">
            <span className="status-pulse-ring" />
            <span className="system-status-banner__text">
              Partial System Outage
            </span>
          </div>
        );
      case "major_outage":
        return (
          <div className="system-status-banner major_outage">
            <span className="status-pulse-ring" />
            <span className="system-status-banner__text">
              Major System Outage
            </span>
          </div>
        );
      default:
        return (
          <div className="system-status-banner unknown">
            <span className="status-pulse-ring" />
            <span className="system-status-banner__text">
              System Status Unknown
            </span>
          </div>
        );
    }
  };

  const getBarTooltipText = (bar) => {
    if (bar.isEmpty) return "No history recorded";
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
            <div key={bar.key} className="uptime-bar-wrapper">
              <div className={barClass} />
              <div className="uptime-tooltip">
                <div className="tooltip-time">
                  {bar.isEmpty
                    ? "Placeholder"
                    : new Date(bar.timestamp).toLocaleDateString()}
                </div>
                <div className={`tooltip-status ${isUp ? "up" : "down"}`}>
                  {getBarTooltipText(bar)}
                </div>
              </div>
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
                  {monitor.url}{" "}
                  <FiExternalLink size={10} style={{ marginLeft: "2px" }} />
                </a>
              </div>

              <div className="status-monitor-row__history">
                {renderMonitorBars(monitor.recentLogs)}
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
                    <p>
                      {incident.severity} · {incident.state} ·{" "}
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
                <div className="status-incident-row__services">
                  {(incident.affectedServices || []).map((service) => (
                    <span key={service.monitorId || service.name}>
                      {service.name}
                    </span>
                  ))}
                </div>
                <div className="status-incident-row__timeline">
                  {(incident.timeline || []).slice(-3).map((item) => (
                    <div key={item._id || item.createdAt}>
                      <strong>{item.type.replace(/_/g, " ")}</strong>
                      <span>{item.message}</span>
                    </div>
                  ))}
                </div>
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
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
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
            marginTop: "8px",
          }}
        >
          <a
            href={`${window.location.origin}/status/${slugOrUserId}`}
            target="_blank"
            rel="noreferrer"
            className="status-footer__link"
            style={{
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              opacity: 0.6,
            }}
          >
            <span>Powered by {AppName}</span>
            <FiExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
}
