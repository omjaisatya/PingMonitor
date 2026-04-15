import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import MonitorCard from "../components/MonitorCard";
import MonitorFormModal from "../components/MonitorFormModal";
import DeleteConfirmModal from "../components/DeleteConfModal";
import api from "../api/axios";

// todo - implement websocket for prevent auto refresh page, first implement websocket in server then add here

export default function Dashboard() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMonitor, setEditMonitor] = useState(null);
  const [deleteMonitor, setDeleteMonitor] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchMonitors = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/monitors");

      const list = Array.isArray(data?.allMonitors) ? data.allMonitors : [];

      setMonitors(list);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load monitors";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // refresh auto data 1 minute
  useEffect(() => {
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 60000);
    return () => {
      clearInterval(interval);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [fetchMonitors]);

  const handleAdd = async (formData) => {
    setFormLoading(true);
    try {
      // automatice detect timezone based on user browser
      const timezoneUser = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data } = await api.post("/monitors", {
        ...formData,
        timezone: timezoneUser,
      });
      // console.log(data.createMonitor.timezone);
      const created = data?.monitor;

      if (created?._id) {
        setMonitors((prev) => [created, ...prev]);
        showToast(`"${created.name}" is now being monitored`);
      } else {
        await fetchMonitors();
        showToast("Monitor created");
      }
      setShowAddModal(false);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to create monitor",
        "error",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (formData) => {
    setFormLoading(true);
    try {
      const { data } = await api.put(`/monitors/${editMonitor._id}`, formData);
      const updated = data?.monitor;

      if (updated?._id) {
        setMonitors((prev) =>
          prev.map((m) => (m._id === editMonitor._id ? updated : m)),
        );
        showToast(`"${updated.name}" updated`);
      } else {
        await fetchMonitors();
        showToast("Monitor updated");
      }
      setEditMonitor(null);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update monitor",
        "error",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    const deletedId = deleteMonitor?._id;
    const deletedName = deleteMonitor?.name;
    try {
      await api.delete(`/monitors/${deletedId}`);
      setMonitors((prev) => prev.filter((m) => m._id !== deletedId));
      setDeleteMonitor(null);
      showToast(`"${deletedName}" deleted`);
    } catch {
      showToast("Failed to delete monitor", "error");
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
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              {monitors.length} monitor{monitors.length !== 1 ? "s" : ""} active
              · auto-refreshes every 60s
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            + Add Monitor
          </button>
        </div>

        {!loading && monitors.length > 0 && (
          <div className="stats-grid" style={{ marginBottom: "32px" }}>
            <div className="stat-card">
              <div className="stat-label">Total</div>
              <div className="stat-value">{monitors.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Online</div>
              <div className="stat-value green">{upCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Down</div>
              <div className="stat-value red">{downCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending</div>
              <div className="stat-value yellow">{unknownCount}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-screen">
            <span className="spinner spinner-lg" />
            <p>Loading monitors...</p>
          </div>
        ) : monitors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📡</div>
            <h3>No monitors yet</h3>
            <p>Add your first URL to start tracking uptime</p>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              + Add Your First Monitor
            </button>
          </div>
        ) : (
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
        )}
      </main>

      {toast && (
        <div className={`toast alert alert-${toast.type}`}>{toast.message}</div>
      )}

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
