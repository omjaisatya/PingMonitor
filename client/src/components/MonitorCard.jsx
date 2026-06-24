import { Link } from "react-router-dom";
import "../styles/MonitorCard.css";
import { useState } from "react";
import apiClient from "../api/axios";
import { toast } from "../context/ToastContext";
import { FiServer } from "react-icons/fi";

export default function MonitorCard({ monitor, onEdit, onDelete }) {
  const [isActive, setIsActive] = useState(monitor.isActive);
  const [loading, isLoading] = useState(false);

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

  return (
    <div
      className={`monitor-card ${isDown ? "monitor-card--down" : ""} ${!isActive ? "monitor-card--paused" : ""}`}
    >
      <div className="monitor-card-header">
        <div className="monitor-card-header-left">
          <span className="card-icon-wrapper">
            <FiServer className={`monitor-card-icon ${isUp ? "text-green" : isDown ? "text-red" : "text-yellow"}`} />
          </span>
          <div className="monitor-status-row">
            <span className={`monitor-status-dot ${monitor.status} ${isActive ? "active" : "paused"}`} />
            <span className="monitor-status-text">{isActive ? monitor.status : "paused"}</span>
          </div>
        </div>
        <span className="monitor-interval mono">↻ {monitor.interval}m</span>
      </div>

      <div className="monitor-card-body">
        <h3 className="monitor-name">{monitor.name}</h3>
        <p className="monitor-url mono" title={monitor.url}>{monitor.url}</p>
      </div>

      <div className="monitor-actions">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onEdit(monitor)}
        >
          Edit
        </button>

        <button
          onClick={handleToggleActive}
          disabled={loading}
          className="btn btn-outline btn-sm"
        >
          {isActive ? "Pause" : "Resume"}
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(monitor)}
        >
          Delete
        </button>
      </div>
      <div className="monitor-card-footer">
        <Link to={`/monitors/${monitor._id}`} className="btn btn-ghost btn-sm monitor-logs-link">
          View Logs →
        </Link>
      </div>
    </div>
  );
}
