import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import apiClient from "../api/axios";
import { format } from "date-fns";
import { FiCalendar, FiPlus, FiTrash2, FiClock } from "react-icons/fi";
import MaintenanceFormModal from "../components/MaintenanceFormModal";
import "../styles/Maintenance.css";

const Maintenance = () => {
  const [windows, setWindows] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchWindows = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/maintenance");
      setWindows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWindows();
  }, []);

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this maintenance window?",
      )
    )
      return;
    try {
      await apiClient.delete(`/maintenance/${id}`);
      fetchWindows();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <span className="m-badge m-active">Active</span>;
      case "scheduled":
        return <span className="m-badge m-scheduled">Scheduled</span>;
      case "completed":
        return <span className="m-badge m-completed">Completed</span>;
      default:
        return null;
    }
  };

  return (
    <div
      className="page-container"
      style={{ background: "var(--bg-primary)", minHeight: "100vh" }}
    >
      <Navbar />
      <div
        className="container"
        style={{ paddingTop: "100px", paddingBottom: "50px" }}
      >
        <div className="m-header">
          <div>
            <h1
              style={{
                color: "var(--text-primary)",
                fontSize: "24px",
                marginBottom: "8px",
              }}
            >
              Maintenance Windows
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              Schedule downtime to suppress alerts and notify users on your
              status page.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <FiPlus /> Schedule Window
          </button>
        </div>

        {loading ? (
          <div
            className="loading-state"
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "50px",
            }}
          >
            <span className="spinner"></span>
          </div>
        ) : windows.length === 0 ? (
          <div
            className="empty-state"
            style={{
              textAlign: "center",
              padding: "50px",
              background: "var(--bg-secondary)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              marginTop: "20px",
            }}
          >
            <FiCalendar
              style={{
                fontSize: "40px",
                color: "var(--text-muted)",
                marginBottom: "16px",
              }}
            />
            <h3
              style={{
                color: "var(--text-primary)",
                fontSize: "18px",
                marginBottom: "8px",
              }}
            >
              No maintenance windows
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              You haven't scheduled any maintenance windows yet.
            </p>
          </div>
        ) : (
          <div
            className="m-list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "24px",
            }}
          >
            {windows.map((win) => (
              <div
                key={win._id}
                className="m-card"
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  padding: "20px",
                }}
              >
                <div
                  className="m-card-header"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    className="m-card-title"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <h3
                      style={{
                        color: "var(--text-primary)",
                        fontSize: "18px",
                        margin: 0,
                      }}
                    >
                      {win.title}
                    </h3>
                    {getStatusBadge(win.status)}
                  </div>
                  <button
                    className="btn-icon"
                    onClick={() => handleDelete(win._id)}
                    style={{
                      color: "var(--red)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "8px",
                      borderRadius: "8px",
                    }}
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
                <div className="m-card-body">
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "14px",
                      marginBottom: "16px",
                      lineHeight: "1.5",
                    }}
                  >
                    {win.description}
                  </p>
                  <div
                    className="m-times"
                    style={{
                      display: "flex",
                      gap: "24px",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <FiClock color="var(--text-muted)" />{" "}
                      <strong>Start:</strong>{" "}
                      {format(new Date(win.startTime), "PPp")} ({win.timezone})
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <FiClock color="var(--text-muted)" />{" "}
                      <strong>End:</strong>{" "}
                      {format(new Date(win.endTime), "PPp")} ({win.timezone})
                    </div>
                  </div>
                  <div
                    style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "16px" }}
                  >
                    <strong>Recurrence:</strong>{" "}
                    <span style={{ textTransform: "capitalize" }}>
                      {win.recurringFrequency}
                    </span>
                  </div>

                  <div className="m-card-targets">
                    {!(
                      (win.monitors && win.monitors.length > 0) ||
                      (win.syntheticMonitors && win.syntheticMonitors.length > 0) ||
                      (win.apiMonitors && win.apiMonitors.length > 0) ||
                      (win.heartbeats && win.heartbeats.length > 0)
                    ) ? (
                      <div className="m-target-warning">
                        <span>⚠️ No targets selected (this maintenance window will not suppress any alerts).</span>
                      </div>
                    ) : (
                      <div className="m-targets-list">
                        {win.monitors && win.monitors.length > 0 && (
                          <div className="m-target-category">
                            <span className="m-target-cat-label">HTTP/TCP:</span>
                            <div className="m-target-pills">
                              {win.monitors.map((m) => (
                                <span key={m._id} className="m-target-pill" title={m.url}>
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {win.apiMonitors && win.apiMonitors.length > 0 && (
                          <div className="m-target-category">
                            <span className="m-target-cat-label">API:</span>
                            <div className="m-target-pills">
                              {win.apiMonitors.map((a) => (
                                <span key={a._id} className="m-target-pill">
                                  {a.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {win.syntheticMonitors && win.syntheticMonitors.length > 0 && (
                          <div className="m-target-category">
                            <span className="m-target-cat-label">Synthetic:</span>
                            <div className="m-target-pills">
                              {win.syntheticMonitors.map((s) => (
                                <span key={s._id} className="m-target-pill">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {win.heartbeats && win.heartbeats.length > 0 && (
                          <div className="m-target-category">
                            <span className="m-target-cat-label">Heartbeat:</span>
                            <div className="m-target-pills">
                              {win.heartbeats.map((h) => (
                                <span key={h._id} className="m-target-pill">
                                  {h.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <MaintenanceFormModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchWindows();
          }}
        />
      )}
    </div>
  );
};

export default Maintenance;
