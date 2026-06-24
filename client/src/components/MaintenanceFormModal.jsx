import React, { useState } from "react";
import apiClient from "../api/axios";
import { FiX, FiCalendar } from "react-icons/fi";
import { useToast } from "../context/ToastContext";

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET) - New York" },
  { value: "America/Chicago", label: "Central Time (CT) - Chicago" },
  { value: "America/Denver", label: "Mountain Time (MT) - Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT) - Los Angeles" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST) - Kolkata" },
  { value: "Asia/Singapore", label: "Singapore Standard Time (SGT)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST) - Tokyo" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET) - Sydney" },
];

const MaintenanceFormModal = ({ onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validationErr, setValidationErr] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    recurringFrequency: "none",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startTime || !formData.endTime) {
      setValidationErr("Please fill all required fields");
      return;
    }
    
    setLoading(true);
    setValidationErr("");
    try {
      await apiClient.post("/api/maintenance", formData);
      showToast("Maintenance window scheduled successfully", "success");
      onSuccess();
    } catch (err) {
      setValidationErr(err.response?.data?.message || "Failed to schedule maintenance window");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setValidationErr("");
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "560px" }}>
        <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FiCalendar size={20} /> Schedule Maintenance
        </h2>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          minHeight: "280px",
          maxHeight: "58vh",
          overflowY: "auto",
          paddingRight: "8px",
          marginTop: "16px"
        }}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Database Upgrade"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Reason for maintenance..."
              style={{ minHeight: "80px", resize: "vertical" }}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                className="form-input"
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input
                className="form-input"
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select
                className="form-input"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                style={{ backgroundPosition: "right 12px center" }}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Recurrence</label>
              <select
                className="form-input"
                name="recurringFrequency"
                value={formData.recurringFrequency}
                onChange={handleChange}
                style={{ backgroundPosition: "right 12px center" }}
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {validationErr && (
            <div className="alert alert-error" style={{ fontSize: "12px", marginTop: "8px" }}>
              {validationErr}
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: "24px" }}>
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> Scheduling...
              </>
            ) : (
              "Schedule Window"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceFormModal;
