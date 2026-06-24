import { useState, useEffect } from "react";
import api from "../api/axios";
import { toast } from "../context/ToastContext";
import {
  FiX,
  FiActivity,
  FiTerminal,
  FiAlertTriangle,
  FiFilm,
  FiImage,
  FiSearch,
} from "react-icons/fi";
import "../styles/Synthetic.css";

export default function ReplayViewerModal({ runId, onClose }) {
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("logs"); // 'logs' | 'requests' | 'screenshot'
  const [logFilter, setLogFilter] = useState("all"); // 'all' | 'log' | 'info' | 'warning' | 'error'
  const [logSearch, setLogSearch] = useState("");

  useEffect(() => {
    const fetchRunDetail = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/synthetic-monitors/runs/${runId}`);
        setRun(data.run);
        if (data.run?.status === "failed") {
          setActiveTab("screenshot");
        }
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to load execution run detail",
        );
        onClose();
      } finally {
        setLoading(false);
      }
    };

    if (runId) {
      fetchRunDetail();
    }
  }, [runId, onClose]);

  if (loading) {
    return (
      <div className="synthetic-modal-overlay">
        <div className="synthetic-modal-content modal-loading">
          <span className="spinner spinner-lg"></span>
          <p>Analyzing execution run results...</p>
        </div>
      </div>
    );
  }

  if (!run) return null;

  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3006";
  const videoSrc = run.videoUrl ? `${serverUrl}${run.videoUrl}` : "";
  const screenshotSrc = run.screenshotUrl
    ? `${serverUrl}${run.screenshotUrl}`
    : "";

  // Filter console logs
  const filteredLogs =
    run.consoleLogs?.filter((log) => {
      const matchesFilter = logFilter === "all" || log.type === logFilter;
      const matchesSearch = log.text
        .toLowerCase()
        .includes(logSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    }) || [];

  return (
    <div className="synthetic-modal-overlay">
      <div className="synthetic-modal-content">
        {/* Header */}
        <div className="synthetic-modal-header">
          <div>
            <div className="modal-title-row">
              <h2>Run Execution Detail</h2>
              <span className={`status-badge badge-${run.status}`}>
                {run.status === "success" ? "SUCCESS" : "FAILED"}
              </span>
            </div>
            <p className="modal-subtitle">
              Executed on {new Date(run.startTime).toLocaleString()} • Duration:{" "}
              {(run.duration / 1000).toFixed(2)}s
            </p>
          </div>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="synthetic-modal-body">
          <div className="media-panel">
            <div className="media-header">
              <span className="media-title">
                <FiFilm style={{ marginRight: "6px" }} /> Execution Replay
              </span>
            </div>

            <div className="video-container">
              {videoSrc ? (
                <video
                  key={videoSrc}
                  controls
                  width="100%"
                  className="replay-video"
                >
                  <source src={videoSrc} type="video/webm" />
                  Your browser does not support WebM video playback.
                </video>
              ) : (
                <div className="no-media-placeholder">
                  <FiFilm size={40} className="muted-icon" />
                  <p>Execution video recording not available</p>
                </div>
              )}
            </div>

            <div className="metrics-section">
              <h3>
                <FiActivity
                  style={{ marginRight: "6px", verticalAlign: "middle" }}
                />{" "}
                Performance Metrics
              </h3>
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Load Time</span>
                  <span className="metric-value">
                    {run.metrics?.loadTime || 0}ms
                  </span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">DOM Ready</span>
                  <span className="metric-value">
                    {run.metrics?.domReady || 0}ms
                  </span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">TTFB</span>
                  <span className="metric-value">
                    {run.metrics?.ttfb || 0}ms
                  </span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">DNS</span>
                  <span className="metric-value">
                    {run.metrics?.dns || 0}ms
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="details-panel">
            <div className="tab-header">
              <button
                className={`tab-btn ${activeTab === "logs" ? "active" : ""}`}
                onClick={() => setActiveTab("logs")}
              >
                <FiTerminal style={{ marginRight: "6px" }} /> Console Logs (
                {run.consoleLogs?.length || 0})
              </button>
              <button
                className={`tab-btn ${activeTab === "requests" ? "active" : ""}`}
                onClick={() => setActiveTab("requests")}
              >
                <FiAlertTriangle style={{ marginRight: "6px" }} /> Failed
                Requests ({run.failedRequests?.length || 0})
              </button>
              {run.status === "failed" && (
                <button
                  className={`tab-btn ${activeTab === "screenshot" ? "active" : ""}`}
                  onClick={() => setActiveTab("screenshot")}
                >
                  <FiImage style={{ marginRight: "6px" }} /> Failure Screenshot
                </button>
              )}
            </div>

            <div className="tab-content">
              {activeTab === "logs" && (
                <div className="logs-view">
                  <div className="logs-filters-row">
                    <div className="search-box">
                      <FiSearch className="search-icon" size={14} />
                      <input
                        type="text"
                        placeholder="Search console logs..."
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="filter-select"
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                    >
                      <option value="all">All Levels</option>
                      <option value="log">Log</option>
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>

                  <div className="logs-console-window">
                    {filteredLogs.length === 0 ? (
                      <div className="empty-logs">
                        No console output found matching filters
                      </div>
                    ) : (
                      filteredLogs.map((log, index) => (
                        <div
                          key={index}
                          className={`console-line console-${log.type}`}
                        >
                          <span className="console-timestamp">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour12: false,
                            })}
                          </span>
                          <span className="console-type">
                            [{log.type.toUpperCase()}]
                          </span>
                          <span className="console-text">{log.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === "requests" && (
                <div className="requests-view">
                  {run.failedRequests?.length === 0 ? (
                    <div className="empty-state-card">
                      <FiCheck size={32} className="success-icon" />
                      <p>
                        All network requests resolved successfully (No 4xx/5xx
                        errors)
                      </p>
                    </div>
                  ) : (
                    <div className="failed-requests-list">
                      {run.failedRequests?.map((req, index) => (
                        <div key={index} className="failed-req-card">
                          <div className="req-header">
                            <span className="req-method">{req.method}</span>
                            <span className="req-error-badge">
                              {req.errorText}
                            </span>
                          </div>
                          <div className="req-url" title={req.url}>
                            {req.url}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "screenshot" && (
                <div className="screenshot-view">
                  {screenshotSrc ? (
                    <div className="screenshot-container">
                      <img
                        src={screenshotSrc}
                        alt="Failure Screen Capture"
                        className="failure-img"
                      />
                      <a
                        href={screenshotSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="screenshot-zoom-link"
                      >
                        Open image in new tab
                      </a>
                    </div>
                  ) : (
                    <div className="no-media-placeholder">
                      <FiImage size={40} className="muted-icon" />
                      <p>Failure screenshot was not captured</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
