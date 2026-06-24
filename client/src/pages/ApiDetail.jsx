import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import ApiRunViewerModal from "../components/ApiRunViewerModal";
import api from "../api/axios";
import { toast } from "../context/ToastContext";
import {
  FiArrowLeft,
  FiPlay,
  FiActivity,
  FiTerminal,
  FiClock,
  FiFileText,
  FiSettings,
  FiToggleLeft,
  FiToggleRight,
  FiLayers,
} from "react-icons/fi";
import Pagination from "../components/Pagination";
import "../styles/Synthetic.css";
import "../styles/Api.css";

export default function ApiDetail() {
  const { id } = useParams();
  const [monitor, setMonitor] = useState(null);
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState({
    avgResponseTime: 0,
    successRate: 100,
    totalRunsCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedRunId, setSelectedRunId] = useState(null);

  const fetchDetails = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/api-monitors/${id}?page=${page}&status=${statusFilter}`,
      );
      setMonitor(data.monitor);
      setRuns(data.runs || []);
      setStats(
        data.stats || {
          avgResponseTime: 0,
          successRate: 100,
          totalRunsCount: 0,
        },
      );
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load API monitor details",
      );
    } finally {
      setLoading(false);
    }
  }, [id, page, statusFilter]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleRunNow = async () => {
    setExecuting(true);
    toast.info("Executing API request check, please wait...");
    try {
      const { data } = await api.post(`/api-monitors/${id}/run`);
      toast.success(data.message || "API assertions checks completed!");
      fetchDetails();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to execute API monitor run",
      );
    } finally {
      setExecuting(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const { data } = await api.post(`/api-monitors/${id}/pause`);
      setMonitor(data.monitor);
      toast.success(data.message);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to pause/resume monitor",
      );
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div
          className="modal-loading"
          style={{
            minHeight: "400px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <span className="spinner spinner-lg"></span>
          <p style={{ color: "var(--text-muted)" }}>
            Analyzing API request timelines...
          </p>
        </div>
      </>
    );
  }

  if (!monitor) {
    return (
      <>
        <Navbar />
        <div className="api-container">
          <div className="empty-state-card">
            <h3>API Monitor Not Found</h3>
            <p>
              The monitor might have been deleted or you don't have permission
              to access it.
            </p>
            <Link
              to="/api-monitors"
              className="btn-primary"
              style={{ marginTop: "12px" }}
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="synthetic-detail-container">
        {/* Back navigation */}
        <div style={{ marginBottom: "24px" }}>
          <Link
            to="/api-monitors"
            className="btn-icon-only"
            style={{
              display: "inline-flex",
              gap: "6px",
              alignItems: "center",
              color: "var(--text-muted)",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            <FiArrowLeft /> Back to API Monitors
          </Link>
        </div>

        {/* Monitor Header */}
        <div className="synthetic-header-row">
          <div>
            <div className="modal-title-row">
              <span
                className={`method-badge method-${monitor.method.toLowerCase()}`}
                style={{ fontSize: "14px", padding: "4px 10px" }}
              >
                {monitor.method}
              </span>
              <h1 style={{ display: "inline-block" }}>{monitor.name}</h1>
              <span
                className={`status-badge badge-${monitor.status}`}
                style={{ marginLeft: "12px" }}
              >
                {monitor.status.toUpperCase()}
              </span>
            </div>
            <p
              className="modal-subtitle"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {monitor.url}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              className="btn-secondary"
              onClick={handleToggleActive}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {monitor.isActive ? (
                <>
                  <FiToggleRight size={18} style={{ color: "#00ff88" }} />{" "}
                  Active
                </>
              ) : (
                <>
                  <FiToggleLeft size={18} style={{ color: "#8888aa" }} /> Paused
                </>
              )}
            </button>
            <button
              className="btn-primary"
              onClick={handleRunNow}
              disabled={executing || !monitor.isActive}
            >
              <FiPlay /> {executing ? "Executing..." : "Run Now"}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="detail-stats-grid">
          <div className="stat-box">
            <span className="stat-box-title">
              <FiActivity
                style={{ marginRight: "6px", verticalAlign: "middle" }}
              />{" "}
              Success Rate (Last 50)
            </span>
            <span
              className="stat-box-value"
              style={{
                color:
                  stats.successRate >= 90
                    ? "#00ff88"
                    : stats.successRate >= 50
                      ? "#ffb703"
                      : "#ff4466",
              }}
            >
              {stats.successRate}%
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-box-title">
              <FiClock
                style={{ marginRight: "6px", verticalAlign: "middle" }}
              />{" "}
              Avg Latency
            </span>
            <span className="stat-box-value">{stats.avgResponseTime}ms</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-title">
              <FiTerminal
                style={{ marginRight: "6px", verticalAlign: "middle" }}
              />{" "}
              Checks Executed
            </span>
            <span className="stat-box-value">{stats.totalRunsCount}</span>
          </div>
        </div>

        <div className="script-code-section">
          <div className="section-header">
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiFileText size={16} />
              <h3>Request Configuration</h3>
            </div>
            <span className="card-interval">
              <FiLayers style={{ marginRight: "4px" }} /> interval: every{" "}
              {monitor.interval}m
            </span>
          </div>
          <div
            style={{
              padding: "20px 24px",
              color: "#a0a0c0",
              background: "#0e0e16",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
              }}
            >
              <div>
                <h4
                  style={{
                    color: "#ffffff",
                    fontSize: "13px",
                    margin: "0 0 8px 0",
                  }}
                >
                  HTTP Headers
                </h4>
                {monitor.headers?.length === 0 ? (
                  <p style={{ fontStyle: "italic", fontSize: "12.5px" }}>
                    No custom headers sent
                  </p>
                ) : (
                  <table className="keyvalue-table" style={{ marginTop: 0 }}>
                    <tbody>
                      {monitor.headers?.map((h, index) => (
                        <tr
                          key={index}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.02)",
                          }}
                        >
                          <td
                            style={{
                              color: "#8888aa",
                              fontFamily: "var(--font-mono)",
                              fontSize: "12px",
                              width: "40%",
                            }}
                          >
                            {h.key}
                          </td>
                          <td
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "12px",
                            }}
                          >
                            {h.isSecure ? (
                              <code style={{ color: "#ffb703" }}>
                                •••••••• (secured)
                              </code>
                            ) : (
                              <code>{h.value}</code>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h4
                  style={{
                    color: "#ffffff",
                    fontSize: "13px",
                    margin: "0 0 8px 0",
                  }}
                >
                  Assertions Checklist
                </h4>
                {monitor.assertions?.length === 0 ? (
                  <p
                    style={{
                      fontStyle: "italic",
                      fontSize: "12.5px",
                      color: "#ff4466",
                    }}
                  >
                    No assertions checks defined
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {monitor.assertions?.map((a, index) => (
                      <div
                        key={index}
                        style={{
                          fontSize: "12.5px",
                          background: "#12121e",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid #1e1e2f",
                        }}
                      >
                        <code style={{ color: "#6c5ce7" }}>{a.type}</code>{" "}
                        {a.property && <code>({a.property})</code>}{" "}
                        <span style={{ color: "#8888aa" }}>{a.operator}</span>{" "}
                        <code>{a.target}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {monitor.body && (
              <div style={{ marginTop: "20px" }}>
                <h4
                  style={{
                    color: "#ffffff",
                    fontSize: "13px",
                    margin: "0 0 8px 0",
                  }}
                >
                  Request Payload
                </h4>
                <pre
                  className="script-display-box"
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    maxHeight: "150px",
                  }}
                >
                  {monitor.body}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="runs-table-section">
          <div className="section-header">
            <h3>Execution Run Logs</h3>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ padding: "4px 8px", fontSize: "12px" }}
            >
              <option value="all">All Runs</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {runs.length === 0 ? (
            <div className="empty-state-card" style={{ border: "none" }}>
              <FiActivity size={32} className="muted-icon" />
              <p>No execution runs logged for this search</p>
            </div>
          ) : (
            <>
              <table className="runs-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Execution Time</th>
                    <th>Latency</th>
                    <th>Code</th>
                    <th>Assertions</th>
                    <th>INSPECT RESPONSE</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const passedCount =
                      run.assertionResults?.filter((r) => r.passed).length || 0;
                    const totalAssertions = run.assertionResults?.length || 0;
                    return (
                      <tr key={run._id}>
                        <td>
                          <span className={`status-badge badge-${run.status}`}>
                            {run.status.toUpperCase()}
                          </span>
                        </td>
                        <td>{new Date(run.startTime).toLocaleString()}</td>
                        <td>{run.response?.responseTime || run.duration}ms</td>
                        <td>
                          {run.response?.status ? (
                            <code
                              style={{
                                color:
                                  run.response.status < 400
                                    ? "#00ff88"
                                    : "#ff4466",
                              }}
                            >
                              {run.response.status}
                            </code>
                          ) : (
                            <span
                              style={{ color: "#ff4466", fontSize: "12px" }}
                            >
                              ERR
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="card-interval">
                            {passedCount}/{totalAssertions} passed
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-inspect"
                            onClick={() => setSelectedRunId(run._id)}
                          >
                            Inspect Response
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div
                  style={{
                    padding: "16px",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* API Run Details Popup Replay */}
      {selectedRunId && (
        <ApiRunViewerModal
          runId={selectedRunId}
          onClose={() => setSelectedRunId(null)}
        />
      )}
    </>
  );
}
