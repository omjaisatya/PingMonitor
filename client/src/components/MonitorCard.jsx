import { Link } from "react-router-dom";
import "../styles/MonitorCard.css";
import { useState } from "react";
import apiClient from "../api/axios";
import { toast } from "react-toastify";

export default function MonitorCard({ monitor, onEdit, onDelete }) {
  const [isActive, setIsActive] = useState(monitor.isActive);
  const [loading, isLoading] = useState(false);

  const statusClass = `badge badge-${monitor.status}`;

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

  return (
    <div
      className={`monitor-card ${monitor.status === "down" ? "monitor-card--down" : ""}`}
    >
      <div className="monitor-card-header">
        <span className={statusClass}>{monitor.status}</span>
        <span className="monitor-interval mono">↻ {monitor.interval}m</span>
      </div>

      <div className="monitor-card-body">
        <h3 className="monitor-name">{monitor.name}</h3>
        <p className="monitor-url mono">{monitor.url}</p>
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
        <Link to={`/monitors/${monitor._id}`} className="btn btn-ghost btn-sm">
          View Logs →
        </Link>
      </div>
    </div>
  );
}
