import { Link } from "react-router-dom";
import "../styles/MonitorCard.css";

export default function MonitorCard({ monitor, onEdit, onDelete }) {
  const statusClass = `badge badge-${monitor.status}`;

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

      <div className="monitor-card-footer">
        <Link to={`/monitors/${monitor._id}`} className="btn btn-ghost btn-sm">
          View Logs →
        </Link>
        <div className="monitor-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => onEdit(monitor)}
          >
            Edit
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onDelete(monitor)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
