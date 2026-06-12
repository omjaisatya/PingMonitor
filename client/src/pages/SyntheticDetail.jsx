import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import ReplayViewerModal from "../components/ReplayViewerModal";
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
} from "react-icons/fi";
import Pagination from "../components/Pagination";
import "../styles/Synthetic.css";

export default function SyntheticDetail() {
  const { id } = useParams();
  const [monitor, setMonitor] = useState(null);
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState({
    avgLoadTime: 0,
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
        `/synthetic-monitors/${id}?page=${page}&status=${statusFilter}`,
      );
      setMonitor(data.synthetic);
      setRuns(data.runs || []);
      setStats(
        data.stats || { avgLoadTime: 0, successRate: 100, totalRunsCount: 0 },
      );
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Failed to load synthetic monitor details",
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
    toast.info("Triggering Playwright browser run, please wait...");
    try {
      const { data } = await api.post(`/synthetic-monitors/${id}/run`);
      toast.success(
        data.message || "Synthetic check execution successfully finished!",
      );
      fetchDetails();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Failed to run synthetic script execution",
      );
    } finally {
      setExecuting(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const { data } = await api.post(`/synthetic-monitors/${id}/pause`);
      setMonitor(data.synthetic);
      toast.success(data.message);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to change active status",
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
            Analyzing synthetic script history...
          </p>
        </div>
      </>
    );
  }

  if (!monitor) {
    return (
      <>
        <Navbar />
        <div className="synthetic-container">
          <div className="empty-state-card">
            <h3>Synthetic Monitor Not Found</h3>
            <p>
              The monitor might have been deleted or you don't have permission
              to access it.
            </p>
            <Link
              to="/synthetic"
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
        {/* Back Link & Header */}
        <div style={{ marginBottom: "24px" }}>
          <Link
            to="/synthetic"
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
            <FiArrowLeft /> Back to Synthetics
          </Link>
        </div>

        <div className="synthetic-header-row">
          <div>
            <div className="modal-title-row">
              <h1 style={{ display: "inline-block" }}>{monitor.name}</h1>
              <span className={`status-badge badge-${monitor.status}`}>
                {monitor.status.toUpperCase()}
              </span>
            </div>
            <p className="modal-subtitle">
              Checks run every {monitor.interval} minutes • Script execution
              timeout: {monitor.timeout / 1000}s
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

        <div className="detail-stats-grid">
          <div className="stat-box">
            <span className="stat-box-title">
              <FiActivity
                style={{ marginRight: "6px", verticalAlign: "middle" }}
              />{" "}
              Success Rate
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
              Avg Load Time
            </span>
            <span className="stat-box-value">{stats.avgLoadTime}ms</span>
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
              <h3>Playwright Automation Script</h3>
            </div>
            <span className="card-interval">JS Sandbox (Playwright Page)</span>
          </div>
          <pre className="script-display-box">{monitor.script}</pre>
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
              <p>No execution runs logged yet for this filter</p>
            </div>
          ) : (
            <>
              <table className="runs-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Execution Time</th>
                    <th>Runtime Duration</th>
                    <th>Page Load Time</th>
                    <th>TIMELINE REPLAY</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run._id}>
                      <td>
                        <span className={`status-badge badge-${run.status}`}>
                          {run.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{new Date(run.startTime).toLocaleString()}</td>
                      <td>{(run.duration / 1000).toFixed(2)}s</td>
                      <td>{run.metrics?.loadTime || 0}ms</td>
                      <td>
                        <button
                          className="btn-inspect"
                          onClick={() => setSelectedRunId(run._id)}
                        >
                          Inspect Replay
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {selectedRunId && (
        <ReplayViewerModal
          runId={selectedRunId}
          onClose={() => setSelectedRunId(null)}
        />
      )}
    </>
  );
}
