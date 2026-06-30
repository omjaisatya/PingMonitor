import { Link } from "react-router-dom";
import "../styles/Synthetic.css";
import "../styles/Heartbeats.css";
import { useState, useEffect } from "react";
import apiClient from "../api/axios";
import { toast } from "../context/ToastContext";
import { FiPause, FiPlay, FiTrash2, FiChevronRight, FiClock, FiEdit3 } from "react-icons/fi";

export default function MonitorCard({ monitor, onEdit, onDelete }) {
  const [isActive, setIsActive] = useState(monitor.isActive);
  const [loading, isLoading] = useState(false);

  useEffect(() => {
    setIsActive(monitor.isActive);
  }, [monitor.isActive]);

  const handleToggleActive = async () => {
    isLoading(true);
    try {
      const api = await apiClient.patch(`/monitors/${monitor._id}/toggle`);
      setIsActive(!isActive);
      toast.success(api.data.message);
    } catch (error) {
      const msg =
        error.response?.data?.message || error.message || "Failed to update";
      toast.error(msg);
    } finally {
      isLoading(false);
    }
  };

  const isUp = monitor.status === "up";
  const isDown = monitor.status === "down";

  const badgeClass = !isActive
    ? "paused"
    : monitor.status === "up"
      ? "success"
      : monitor.status === "down"
        ? "failed"
        : "paused";

  const badgeText = !isActive
    ? "PAUSED"
    : monitor.status === "up"
      ? "HEALTHY"
      : monitor.status === "down"
        ? "FAILED"
        : "PENDING";

  return (
    <div
      className={`synthetic-card ${isDown ? "monitor-card--down" : ""} ${!isActive ? "monitor-card--paused" : ""}`}
    >
      <div>
        <div className="card-top">
          <Link to={`/monitors/${monitor._id}`} className="card-title">
            {monitor.name}
          </Link>
          <span className="card-interval">
            <FiClock style={{ marginRight: "4px", verticalAlign: "middle" }} />
            Every {monitor.interval}m
          </span>
        </div>

        <div className="card-middle" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="copy-input-group" style={{ margin: 0 }}>
            <span className="copy-input" style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }} title={monitor.url}>
              {monitor.url}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Last Checked:</span>
              <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                {monitor.updatedAt ? new Date(monitor.updatedAt).toLocaleTimeString() : "Never"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Method:</span>
              <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                {monitor.method || "GET"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-bottom" style={{ marginTop: "16px" }}>
        <span className={`status-badge badge-${badgeClass}`}>
          {badgeText}
        </span>

        <div className="card-actions">
          <button
            className="btn-icon-only"
            onClick={handleToggleActive}
            disabled={loading}
            title={isActive ? "Pause Monitor" : "Resume Monitor"}
          >
            {isActive ? <FiPause size={16} /> : <FiPlay size={16} />}
          </button>
          <button
            className="btn-icon-only"
            onClick={() => onEdit(monitor)}
            title="Edit Monitor"
          >
            <FiEdit3 size={16} />
          </button>
          <button
            className="btn-icon-only btn-delete"
            onClick={() => onDelete(monitor)}
            title="Delete Monitor"
          >
            <FiTrash2 size={16} />
          </button>
          <Link
            to={`/monitors/${monitor._id}`}
            className="btn-icon-only"
            title="View Details"
            style={{ color: "var(--accent)" }}
          >
            <FiChevronRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
