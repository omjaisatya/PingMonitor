import React, { useState, useEffect } from "react";
import apiClient from "../api/axios";
import { FiCalendar, FiSearch, FiCheckSquare } from "react-icons/fi";
import { toast } from "../context/ToastContext";

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
  const [loading, setLoading] = useState(false);
  const [validationErr, setValidationErr] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    recurringFrequency: "none",
    monitors: [],
    syntheticMonitors: [],
    apiMonitors: [],
    heartbeats: [],
  });

  const [allMonitors, setAllMonitors] = useState([]);
  const [allSynthetics, setAllSynthetics] = useState([]);
  const [allApiMonitors, setAllApiMonitors] = useState([]);
  const [allHeartbeats, setAllHeartbeats] = useState([]);

  const [activeTab, setActiveTab] = useState("monitors"); // "monitors" | "apiMonitors" | "syntheticMonitors" | "heartbeats"
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const [monRes, synRes, apiRes, hbRes] = await Promise.all([
          apiClient.get("/monitors"),
          apiClient.get("/synthetic-monitors"),
          apiClient.get("/api-monitors"),
          apiClient.get("/heartbeats"),
        ]);
        setAllMonitors(monRes.data?.allMonitors || []);
        setAllSynthetics(synRes.data?.synthetics || []);
        setAllApiMonitors(apiRes.data?.monitors || []);
        setAllHeartbeats(hbRes.data?.heartbeats || []);
      } catch (err) {
        console.error("Failed to load monitors for selection:", err);
      }
    };
    fetchEntities();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startTime || !formData.endTime) {
      setValidationErr("Please fill all required fields");
      return;
    }

    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    if (end <= start) {
      setValidationErr("End time must be after start time");
      return;
    }

    setLoading(true);
    setValidationErr("");
    try {
      await apiClient.post("/maintenance", formData);
      toast.success("Maintenance window scheduled successfully");
      onSuccess();
    } catch (err) {
      setValidationErr(err.response?.data?.message || err.message || "Failed to schedule maintenance window");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setValidationErr("");
  };

  const handleToggleSelect = (type, id) => {
    setFormData((prev) => {
      const currentList = prev[type] || [];
      const updatedList = currentList.includes(id)
        ? currentList.filter((x) => x !== id)
        : [...currentList, id];
      return { ...prev, [type]: updatedList };
    });
  };

  const getFilteredList = () => {
    let list = [];
    if (activeTab === "monitors") {
      list = allMonitors.map((m) => ({ id: m._id, name: m.name, sub: m.url }));
    } else if (activeTab === "syntheticMonitors") {
      list = allSynthetics.map((s) => ({ id: s._id, name: s.name, sub: "Synthetic Playwright script" }));
    } else if (activeTab === "apiMonitors") {
      list = allApiMonitors.map((a) => ({ id: a._id, name: a.name, sub: `${a.method || "GET"} ${a.url}` }));
    } else if (activeTab === "heartbeats") {
      list = allHeartbeats.map((h) => ({ id: h._id, name: h.name, sub: `Heartbeat interval: ${h.interval}` }));
    }

    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.sub && item.sub.toLowerCase().includes(query))
    );
  };

  const handleBulkSelect = (type, currentFilteredIds, allSelected) => {
    setFormData((prev) => {
      const currentList = prev[type] || [];
      let newList;
      if (allSelected) {
        newList = currentList.filter((id) => !currentFilteredIds.includes(id));
      } else {
        newList = Array.from(new Set([...currentList, ...currentFilteredIds]));
      }
      return { ...prev, [type]: newList };
    });
  };

  const filtered = getFilteredList();
  const allSelectedOnPage =
    filtered.length > 0 && filtered.every((item) => formData[activeTab]?.includes(item.id));

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "600px" }}>
        <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FiCalendar size={20} /> Schedule Maintenance
        </h2>

        <form onSubmit={handleSubmit}>
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
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Database Upgrade"
                required
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

            <div className="form-row" style={{ display: "flex", gap: "16px" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Start Time *</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">End Time *</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row" style={{ display: "flex", gap: "16px" }}>
              <div className="form-group" style={{ flex: 1 }}>
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
              <div className="form-group" style={{ flex: 1 }}>
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

            <div className="m-targets-container">
              <div className="m-targets-title">Target Monitors & Heartbeats</div>
              
              <div className="m-tabs-header">
                <button
                  type="button"
                  className={`m-tab-btn ${activeTab === "monitors" ? "active" : ""}`}
                  onClick={() => { setActiveTab("monitors"); setSearchQuery(""); }}
                >
                  HTTP/TCP <span className="m-tab-badge">{formData.monitors.length}/{allMonitors.length}</span>
                </button>
                <button
                  type="button"
                  className={`m-tab-btn ${activeTab === "apiMonitors" ? "active" : ""}`}
                  onClick={() => { setActiveTab("apiMonitors"); setSearchQuery(""); }}
                >
                  API <span className="m-tab-badge">{formData.apiMonitors.length}/{allApiMonitors.length}</span>
                </button>
                <button
                  type="button"
                  className={`m-tab-btn ${activeTab === "syntheticMonitors" ? "active" : ""}`}
                  onClick={() => { setActiveTab("syntheticMonitors"); setSearchQuery(""); }}
                >
                  Synthetic <span className="m-tab-badge">{formData.syntheticMonitors.length}/{allSynthetics.length}</span>
                </button>
                <button
                  type="button"
                  className={`m-tab-btn ${activeTab === "heartbeats" ? "active" : ""}`}
                  onClick={() => { setActiveTab("heartbeats"); setSearchQuery(""); }}
                >
                  Heartbeat <span className="m-tab-badge">{formData.heartbeats.length}/{allHeartbeats.length}</span>
                </button>
              </div>

              <div className="m-search-wrapper">
                <input
                  type="text"
                  className="m-search-field"
                  placeholder={`Search ${
                    activeTab === "monitors"
                      ? "HTTP/TCP"
                      : activeTab === "apiMonitors"
                      ? "API"
                      : activeTab === "syntheticMonitors"
                      ? "Synthetic"
                      : "Heartbeat"
                  } monitors...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {filtered.length > 0 && (
                  <label className="m-bulk-checkbox-label">
                    <input
                      type="checkbox"
                      className="m-checkbox-input"
                      checked={allSelectedOnPage}
                      onChange={() => {
                        const filteredIds = filtered.map((x) => x.id);
                        handleBulkSelect(activeTab, filteredIds, allSelectedOnPage);
                      }}
                    />
                    Select Page
                  </label>
                )}
              </div>

              <div className="m-resource-list">
                {filtered.length === 0 ? (
                  <div className="m-resource-empty">
                    No resources found matching filters.
                  </div>
                ) : (
                  filtered.map((item) => {
                    const isSelected = formData[activeTab]?.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`m-resource-row ${isSelected ? "selected" : ""}`}
                        onClick={() => handleToggleSelect(activeTab, item.id)}
                      >
                        <input
                          type="checkbox"
                          className="m-checkbox-input"
                          checked={isSelected}
                          onChange={() => {}} // Row click handles selections
                        />
                        <div className="m-resource-info">
                          <span className="m-resource-name">{item.name}</span>
                          <span className="m-resource-url">{item.sub}</span>
                        </div>
                      </div>
                    );
                  })
                )}
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
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
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
        </form>
      </div>
    </div>
  );
};

export default MaintenanceFormModal;
