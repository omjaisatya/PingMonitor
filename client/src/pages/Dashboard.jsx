import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import MonitorCard from "../components/MonitorCard";
import MonitorFormModal from "../components/MonitorFormModal";
import DeleteConfirmModal from "../components/DeleteConfModal";
import Pagination from "../components/Pagination";
import api from "../api/axios";
import { toast } from "../context/ToastContext";
import { useAuth } from "../hook/useAuth";
import { FiPlus, FiAlertTriangle, FiActivity, FiClock, FiCheck } from "react-icons/fi";
import { useWebSocket } from "../hook/useWebSocket";

export default function Dashboard() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMonitor, setEditMonitor] = useState(null);
  const [deleteMonitor, setDeleteMonitor] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();
  const isVerified = user?.isVerified !== false;

  const fetchMonitors = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/monitors?page=${page}&limit=6`);
      const list = Array.isArray(data?.allMonitors) ? data.allMonitors : [];
      setMonitors(list);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "Failed to load monitors";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  useWebSocket((event) => {
    if (
      event === "monitor:created" ||
      event === "monitor:updated" ||
      event === "monitor:deleted" ||
      event === "check:completed"
    ) {
      fetchMonitors();
    }
  });

  const handleAdd = async (formData) => {
    if (!isVerified) {
      toast.warning("Verify your email before adding monitors");
      return;
    }

    setFormLoading(true);
    try {
      const timezoneUser = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data } = await api.post("/monitors", {
        ...formData,
        timezone: formData.timezone || timezoneUser,
      });

      if (data?.monitor?._id) {
        setMonitors((prev) => [data.monitor, ...prev]);
      } else {
        await fetchMonitors();
      }
      toast.success(data.message);
      setShowAddModal(false);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to create monitor",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const resendVerification = async () => {
    setVerificationLoading(true);
    try {
      const { data } = await api.post("/auth/resend-verification");
      toast.success(data.message || "Verification email sent");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to send verification email",
      );
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleEdit = async (formData) => {
    setFormLoading(true);
    try {
      const { data } = await api.put(`/monitors/${editMonitor._id}`, formData);

      if (data?.monitor?._id) {
        setMonitors((prev) =>
          prev.map((m) => (m._id === editMonitor._id ? data.monitor : m)),
        );
      } else {
        await fetchMonitors();
      }
      toast.info(data.message);
      setEditMonitor(null);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to update monitor",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      const { data } = await api.delete(`/monitors/${deleteMonitor._id}`);
      setMonitors((prev) => prev.filter((m) => m._id !== deleteMonitor._id));
      toast.success(data.message);
      setDeleteMonitor(null);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete monitor",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const upCount = monitors.filter((m) => m?.status === "up").length;
  const downCount = monitors.filter((m) => m?.status === "down").length;
  const unknownCount = monitors.filter((m) => m?.status === "unknown").length;

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <h1 className="page-title">Dashboard</h1>
              <span className="badge badge-up" style={{ fontSize: "10px", padding: "2px 8px", alignSelf: "center" }}>
                LIVE
              </span>
            </div>
            <p className="page-subtitle">
              Tracking {monitors.length} active monitor{monitors.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() =>
              isVerified
                ? setShowAddModal(true)
                : toast.warning("Verify your email before adding monitors")
            }
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FiPlus size={16} /> Add Monitor
          </button>
        </div>

        {!isVerified && (
          <div
            className="alert alert-warning"
            style={{
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <FiAlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div>
              Verify your email to add monitors, change monitor settings, and
              receive alert emails.{" "}
              <button
                className="btn btn-outline"
                onClick={resendVerification}
                disabled={verificationLoading}
                style={{ marginLeft: "12px" }}
              >
                {verificationLoading ? "Sending..." : "Resend verification"}
              </button>
            </div>
          </div>
        )}

        {!loading && monitors.length > 0 && (
          <div className="stats-grid" style={{ marginBottom: "32px" }}>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="card-icon-wrapper">
                  <FiActivity className="stat-card-icon text-accent" />
                </span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-value">{monitors.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="card-icon-wrapper">
                  <FiCheck className="stat-card-icon text-green" />
                </span>
                <span className="stat-label">Online</span>
              </div>
              <div className="stat-value green">{upCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="card-icon-wrapper">
                  <FiAlertTriangle className="stat-card-icon text-red" />
                </span>
                <span className="stat-label">Down</span>
              </div>
              <div className="stat-value red">{downCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="card-icon-wrapper">
                  <FiClock className="stat-card-icon text-yellow" />
                </span>
                <span className="stat-label">Pending</span>
              </div>
              <div className="stat-value yellow">{unknownCount}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="monitors-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="monitor-card skeleton-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'auto', minHeight: '230px' }}>
                <div className="monitor-card-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="monitor-card-header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="card-icon-wrapper skeleton" style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)' }} />
                    <div className="skeleton" style={{ width: '60px', height: '14px' }} />
                  </div>
                  <span className="skeleton" style={{ width: '40px', height: '14px' }} />
                </div>
                <div className="monitor-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 0 }}>
                  <div className="skeleton skeleton-title" style={{ width: '70%', height: '20px', marginBottom: 0 }} />
                  <div className="skeleton skeleton-text" style={{ width: '90%', height: '12px', marginBottom: 0 }} />
                </div>
                <div className="monitor-actions" style={{ marginTop: 'auto', display: 'flex', gap: '8px', padding: 0 }}>
                  <div className="skeleton" style={{ width: '50px', height: '28px', borderRadius: 'var(--radius-sm)' }} />
                  <div className="skeleton" style={{ width: '60px', height: '28px', borderRadius: 'var(--radius-sm)' }} />
                  <div className="skeleton" style={{ width: '60px', height: '28px', borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div className="monitor-card-footer" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0, display: 'flex', alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: '80px', height: '14px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : monitors.length === 0 ? (
          <div className="empty-state">
            <div
              className="empty-state-icon"
              style={{
                fontSize: "32px",
                color: "var(--text-muted)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <FiActivity size={36} />
            </div>
            <h3>No monitors yet</h3>
            <p>Add your first URL to start tracking uptime</p>
            <button
              className="btn btn-primary"
              onClick={() =>
                isVerified
                  ? setShowAddModal(true)
                  : toast.warning("Verify your email before adding monitors")
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                margin: "16px auto 0",
              }}
            >
              <FiPlus size={16} /> Add Your First Monitor
            </button>
          </div>
        ) : (
          <>
            <div className="monitors-grid">
              {monitors.map((monitor) =>
                monitor?._id ? (
                  <MonitorCard
                    key={monitor._id}
                    monitor={monitor}
                    onEdit={setEditMonitor}
                    onDelete={setDeleteMonitor}
                  />
                ) : null,
              )}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </main>

      {showAddModal && (
        <MonitorFormModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAdd}
          loading={formLoading}
        />
      )}
      {editMonitor && (
        <MonitorFormModal
          monitor={editMonitor}
          onClose={() => setEditMonitor(null)}
          onSubmit={handleEdit}
          loading={formLoading}
        />
      )}
      {deleteMonitor && (
        <DeleteConfirmModal
          monitor={deleteMonitor}
          onClose={() => setDeleteMonitor(null)}
          onConfirm={handleDelete}
          loading={formLoading}
        />
      )}
    </div>
  );
}
