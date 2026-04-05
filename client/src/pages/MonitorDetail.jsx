import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import MonitorFormModal from "../components/MonitorFormModal";
import DeleteConfModal from "../components/DeleteConfModal";
import api from "../api/axios";

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const formatResponseTime = (ms) => {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const getResponseTimeClass = (ms) => {
  if (!ms) return "";
  if (ms < 300) return "rt-fast";
  if (ms < 1000) return "rt-medium";
  return "rt-slow";
};

export default function MonitorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [monitor, setMonitor] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDetail = useCallback(async () => {
    try {
      const { data } = await api.get(`/monitors/${id}`);
      setMonitor(data.monitor);
      setLogs(data.logs);
    } catch {
      showToast("Failed to load monitor", "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 60000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  const handleEdit = async (formData) => {
    setFormLoading(true);
    try {
      const { data } = await api.put(`/monitors/${id}`, formData);
      setMonitor(data.monitor);
      setShowEdit(false);
      showToast("Monitor updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await api.delete(`/monitors/${id}`);
      navigate("/dashboard");
    } catch {
      showToast("Delete failed", "error");
      setFormLoading(false);
    }
  };

  // Compute stats from logs
  const upLogs = logs.filter((l) => l.status === "up").length;
  const uptimePct =
    logs.length > 0 ? ((upLogs / logs.length) * 100).toFixed(1) : null;
  const avgResponse =
    logs.length > 0
      ? Math.round(
          logs
            .filter((l) => l.responseTime)
            .reduce((acc, l) => acc + l.responseTime, 0) /
            logs.filter((l) => l.responseTime).length,
        )
      : null;

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div className="loading-screen">
          <span className="spinner spinner-lg" />
          <p>Loading monitor...</p>
        </div>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <main className="main-content">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>Monitor not found</h3>
            <p>It may have been deleted or you don't have access.</p>
            <Link to="/dashboard" className="btn btn-primary">
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content">
        {/* Back link */}
        <Link to="/dashboard" className="back-link">
          ← Dashboard
        </Link>

        {/* Header */}
        <div className="detail-header">
          <div className="detail-header-left">
            <div className="detail-title-row">
              <h1 className="page-title">{monitor.name}</h1>
              <span className={`badge badge-${monitor.status}`}>
                {monitor.status}
              </span>
            </div>
            <p className="monitor-url-display mono">{monitor.url}</p>
          </div>
          <div className="detail-actions">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowEdit(true)}
            >
              Edit
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowDelete(true)}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: "32px" }}>
          <div className="stat-card">
            <div className="stat-label">Status</div>
            <div
              className={`stat-value ${monitor.status === "up" ? "green" : monitor.status === "down" ? "red" : "yellow"}`}
            >
              {monitor.status.toUpperCase()}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Uptime (last {logs.length})</div>
            <div
              className={`stat-value ${uptimePct >= 90 ? "green" : uptimePct >= 70 ? "yellow" : "red"}`}
            >
              {uptimePct !== null ? `${uptimePct}%` : "—"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Response</div>
            <div className="stat-value">
              {avgResponse !== null ? `${avgResponse}ms` : "—"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Interval</div>
            <div className="stat-value">
              {monitor.interval}
              <span
                style={{
                  fontSize: "16px",
                  color: "var(--text-muted)",
                  fontWeight: 400,
                }}
              >
                m
              </span>
            </div>
          </div>
        </div>

        {/* Logs table */}
        <div className="detail-section">
          <h2 className="section-title">
            Recent Logs
            <span className="section-count">{logs.length} entries</span>
          </h2>

          {logs.length === 0 ? (
            <div className="empty-state" style={{ padding: "48px 24px" }}>
              <div className="empty-state-icon">📋</div>
              <h3>No logs yet</h3>
              <p>Logs will appear after the first cron job tick</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>HTTP Code</th>
                    <th>Response Time</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>
                        <span className={`badge badge-${log.status}`}>
                          {log.status}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-code ${log.statusCode >= 400 || !log.statusCode ? "code-error" : "code-ok"}`}
                        >
                          {log.statusCode ?? "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`response-time ${getResponseTimeClass(log.responseTime)}`}
                        >
                          {formatResponseTime(log.responseTime)}
                        </span>
                      </td>
                      <td className="timestamp-cell">
                        {formatDate(log.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`toast alert alert-${toast.type}`}>{toast.message}</div>
      )}

      {showEdit && (
        <MonitorFormModal
          monitor={monitor}
          onClose={() => setShowEdit(false)}
          onSubmit={handleEdit}
          loading={formLoading}
        />
      )}
      {showDelete && (
        <DeleteConfModal
          monitor={monitor}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDelete}
          loading={formLoading}
        />
      )}
    </div>
  );
}
