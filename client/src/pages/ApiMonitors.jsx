import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { toast } from "../context/ToastContext";
import { useAuth } from "../hook/useAuth";
import {
  FiPlus,
  FiTrash2,
  FiPlay,
  FiPause,
  FiClock,
  FiActivity,
  FiChevronRight,
  FiEdit3,
  FiAlertCircle,
  FiX,
  FiFolder,
  FiLayers,
  FiLock,
  FiUnlock,
} from "react-icons/fi";
import "../styles/Synthetic.css";
import "../styles/Api.css";

export default function ApiMonitors() {
  const [collections, setCollections] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("all");

  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingMonitors, setLoadingMonitors] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);

  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);

  const { user } = useAuth();
  const isVerified = user?.isVerified !== false;

  const [colName, setColName] = useState("");
  const [colDesc, setColDesc] = useState("");
  const [colVars, setColVars] = useState([]);

  const [monName, setMonName] = useState("");
  const [monUrl, setMonUrl] = useState("");
  const [monMethod, setMonMethod] = useState("GET");
  const [monCollectionId, setMonCollectionId] = useState("");
  const [monInterval, setMonInterval] = useState(10);
  const [monHeaders, setMonHeaders] = useState([]);
  const [monBody, setMonBody] = useState("");
  const [monAssertions, setMonAssertions] = useState([]);
  const [monEmailAlert, setMonEmailAlert] = useState(true);
  const [monInAppAlert, setMonInAppAlert] = useState(true);
  const [monWebhookAlert, setMonWebhookAlert] = useState(false);
  const [monWebhookUrl, setMonWebhookUrl] = useState("");
  const [monEscalationEmails, setMonEscalationEmails] = useState("");
  const [monAlertCooldown, setMonAlertCooldown] = useState(30);

  const fetchCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      const { data } = await api.get("/api-monitors/collections");
      setCollections(data.collections || []);
    } catch (err) {
      toast.error("Failed to load collections");
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  const fetchMonitors = useCallback(async () => {
    setLoadingMonitors(true);
    try {
      const url =
        selectedCollectionId === "all"
          ? "/api-monitors"
          : `/api-monitors?collectionId=${selectedCollectionId}`;
      const { data } = await api.get(url);
      setMonitors(data.monitors || []);
    } catch (err) {
      toast.error("Failed to load API monitors");
    } finally {
      setLoadingMonitors(false);
    }
  }, [selectedCollectionId]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  const handleOpenCreateCollection = () => {
    setEditingCollection(null);
    setColName("");
    setColDesc("");
    setColVars([]);
    setShowCollectionModal(true);
  };

  const handleOpenEditCollection = (e, col) => {
    e.stopPropagation();
    setEditingCollection(col);
    setColName(col.name);
    setColDesc(col.description || "");
    setColVars(col.variables || []);
    setShowCollectionModal(true);
  };

  const handleAddColVariable = () => {
    setColVars([...colVars, { key: "", value: "", isSecure: false }]);
  };

  const handleRemoveColVariable = (index) => {
    setColVars(colVars.filter((_, i) => i !== index));
  };

  const handleColVariableChange = (index, field, val) => {
    const updated = [...colVars];
    updated[index][field] = val;
    setColVars(updated);
  };

  const handleSaveCollection = async (e) => {
    e.preventDefault();
    if (!colName.trim()) {
      toast.error("Collection name is required");
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: colName,
        description: colDesc,
        variables: colVars.filter((v) => v.key.trim()),
      };

      if (editingCollection) {
        const { data } = await api.put(
          `/api-monitors/collections/${editingCollection._id}`,
          payload,
        );
        setCollections((prev) =>
          prev.map((c) =>
            c._id === editingCollection._id ? data.collection : c,
          ),
        );
        toast.success("Collection updated successfully");
      } else {
        const { data } = await api.post("/api-monitors/collections", payload);
        setCollections((prev) => [data.collection, ...prev]);
        toast.success("Collection created successfully");
      }
      setShowCollectionModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save collection");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCollection = async (e, id) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to delete this collection? Related monitors will not be deleted but will be ungrouped.",
      )
    )
      return;
    try {
      await api.delete(`/api-monitors/collections/${id}`);
      setCollections((prev) => prev.filter((c) => c._id !== id));
      if (selectedCollectionId === id) setSelectedCollectionId("all");
      toast.success("Collection deleted successfully");
    } catch (err) {
      toast.error("Failed to delete collection");
    }
  };

  const handleOpenCreateMonitor = () => {
    setEditingMonitor(null);
    setMonName("");
    setMonUrl("");
    setMonMethod("GET");
    setMonCollectionId(
      selectedCollectionId !== "all" ? selectedCollectionId : "",
    );
    setMonInterval(10);
    setMonHeaders([]);
    setMonBody("");
    setMonAssertions([
      { type: "statusCode", property: "", operator: "equals", target: "200" },
    ]);
    setMonEmailAlert(true);
    setMonInAppAlert(true);
    setMonWebhookAlert(false);
    setMonWebhookUrl("");
    setMonEscalationEmails("");
    setMonAlertCooldown(30);
    setShowMonitorModal(true);
  };

  const handleOpenEditMonitor = (monitor) => {
    setEditingMonitor(monitor);
    setMonName(monitor.name);
    setMonUrl(monitor.url);
    setMonMethod(monitor.method);
    setMonCollectionId(monitor.collectionId || "");
    setMonInterval(monitor.interval);
    setMonHeaders(monitor.headers || []);
    setMonBody(monitor.body || "");
    setMonAssertions(monitor.assertions || []);
    setMonEmailAlert(monitor.alertChannels?.email ?? true);
    setMonInAppAlert(monitor.alertChannels?.inApp ?? true);
    setMonWebhookAlert(monitor.alertChannels?.webhook ?? false);
    setMonWebhookUrl(monitor.webhookUrl || "");
    setMonEscalationEmails(monitor.escalationEmails?.join(", ") || "");
    setMonAlertCooldown(monitor.alertCooldown || 30);
    setShowMonitorModal(true);
  };

  const handleAddHeader = () => {
    setMonHeaders([...monHeaders, { key: "", value: "", isSecure: false }]);
  };

  const handleRemoveHeader = (index) => {
    setMonHeaders(monHeaders.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index, field, val) => {
    const updated = [...monHeaders];
    updated[index][field] = val;
    setMonHeaders(updated);
  };

  const handleAddAssertion = () => {
    setMonAssertions([
      ...monAssertions,
      { type: "statusCode", property: "", operator: "equals", target: "" },
    ]);
  };

  const handleRemoveAssertion = (index) => {
    setMonAssertions(monAssertions.filter((_, i) => i !== index));
  };

  const handleAssertionChange = (index, field, val) => {
    const updated = [...monAssertions];
    updated[index][field] = val;
    setMonAssertions(updated);
  };

  const handleSaveMonitor = async (e) => {
    e.preventDefault();
    if (!monName.trim() || !monUrl.trim()) {
      toast.error("Name and Request URL are required");
      return;
    }

    setFormLoading(true);
    try {
      const emailsArray = monEscalationEmails
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      const payload = {
        name: monName,
        url: monUrl,
        method: monMethod,
        collectionId: monCollectionId || null,
        interval: Number(monInterval),
        headers: monHeaders.filter((h) => h.key.trim()),
        body: monBody,
        assertions: monAssertions,
        alertChannels: {
          email: monEmailAlert,
          inApp: monInAppAlert,
          webhook: monWebhookAlert,
        },
        webhookUrl: monWebhookUrl,
        escalationEmails: emailsArray,
        alertCooldown: Number(monAlertCooldown),
      };

      if (editingMonitor) {
        const { data } = await api.put(
          `/api-monitors/${editingMonitor._id}`,
          payload,
        );
        setMonitors((prev) =>
          prev.map((m) => (m._id === editingMonitor._id ? data.monitor : m)),
        );
        toast.success("API monitor updated successfully");
      } else {
        const { data } = await api.post("/api-monitors", payload);
        setMonitors((prev) => [data.monitor, ...prev]);
        toast.success("API monitor created successfully");
      }
      setShowMonitorModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save API monitor");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const { data } = await api.post(`/api-monitors/${id}/pause`);
      setMonitors((prev) => prev.map((m) => (m._id === id ? data.monitor : m)));
      toast.success(data.message);
    } catch (err) {
      toast.error("Failed to toggle monitor status");
    }
  };

  const handleDeleteMonitor = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this API monitor and its execution log history?",
      )
    )
      return;
    try {
      await api.delete(`/api-monitors/${id}`);
      setMonitors((prev) => prev.filter((m) => m._id !== id));
      toast.success("API monitor deleted successfully");
    } catch (err) {
      toast.error("Failed to delete monitor");
    }
  };

  return (
    <>
      <Navbar />
      <div className="api-container">
        {/* Page Header */}
        <div className="synthetic-header-row">
          <div>
            <h1>Advanced API Monitoring</h1>
            <p>
              Monitor REST & GraphQL endpoints, configure environment variables,
              and evaluate JSON/text response assertions.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              className="btn-secondary"
              onClick={handleOpenCreateCollection}
            >
              <FiPlus /> New Collection
            </button>
            <button className="btn-primary" onClick={handleOpenCreateMonitor}>
              <FiPlus /> New API Monitor
            </button>
          </div>
        </div>

        {/* Verifying Alert Banner */}
        {!isVerified && (
          <div
            className="empty-state-card"
            style={{ border: "1px dashed #ffa800", marginBottom: "24px" }}
          >
            <FiAlertCircle size={24} style={{ color: "#ffa800" }} />
            <p style={{ color: "#ffa800", margin: 0 }}>
              Your account email is unverified. Verification is required to
              trigger alert emails on check-in failures.
            </p>
          </div>
        )}

        {/* API Collections Section */}
        <div className="api-collections-section">
          <div className="collections-header">
            <h2>Collections</h2>
          </div>
          {loadingCollections ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <span className="spinner"></span>
            </div>
          ) : (
            <div className="collections-grid">
              <div
                className={`collection-card ${selectedCollectionId === "all" ? "active" : ""}`}
                onClick={() => setSelectedCollectionId("all")}
              >
                <div>
                  <h3>All Monitors</h3>
                  <p>Browse API monitors across all collections</p>
                </div>
                <span className="collection-meta">
                  <FiLayers style={{ marginRight: "4px" }} /> Grouped
                </span>
              </div>

              {collections.map((col) => (
                <div
                  key={col._id}
                  className={`collection-card ${selectedCollectionId === col._id ? "active" : ""}`}
                  onClick={() => setSelectedCollectionId(col._id)}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <h3>{col.name}</h3>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn-icon-only"
                          onClick={(e) => handleOpenEditCollection(e, col)}
                          title="Edit collection variables"
                        >
                          <FiEdit3 size={13} />
                        </button>
                        <button
                          className="btn-icon-only btn-delete"
                          onClick={(e) => handleDeleteCollection(e, col._id)}
                          title="Delete collection"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <p>{col.description || "No description provided"}</p>
                  </div>
                  <span className="collection-meta">
                    <FiFolder style={{ marginRight: "4px" }} />{" "}
                    {col.variables?.length || 0} variables
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2>API Monitors</h2>
          {loadingMonitors ? (
            <div className="modal-loading" style={{ minHeight: "200px" }}>
              <span className="spinner"></span>
            </div>
          ) : monitors.length === 0 ? (
            <div className="empty-state-card" style={{ marginTop: "16px" }}>
              <FiActivity size={36} className="muted-icon" />
              <h3>No API Monitors Configured</h3>
              <p>
                Add your first monitor or select a different collection filter
                above.
              </p>
              <button
                className="btn-primary"
                onClick={handleOpenCreateMonitor}
                style={{ marginTop: "12px" }}
              >
                Add API Monitor
              </button>
            </div>
          ) : (
            <div className="synthetic-grid" style={{ marginTop: "16px" }}>
              {monitors.map((m) => (
                <div key={m._id} className="synthetic-card">
                  <div>
                    <div className="card-top">
                      <Link
                        to={`/api-monitors/${m._id}`}
                        className="card-title"
                      >
                        {m.name}
                      </Link>
                      <span className="card-interval">Every {m.interval}m</span>
                    </div>
                    <div
                      className="card-middle"
                      style={{ marginBottom: "16px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          className={`method-badge method-${m.method.toLowerCase()}`}
                        >
                          {m.method}
                        </span>
                        <code
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.url}
                        </code>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                          marginTop: "10px",
                        }}
                      >
                        <span
                          className="card-interval"
                          style={{
                            background: "rgba(108,92,231,0.05)",
                            color: "#8b7efc",
                          }}
                        >
                          {m.assertions?.length || 0} assertions
                        </span>
                        {m.collectionId && (
                          <span
                            className="card-interval"
                            style={{
                              background: "rgba(87,204,153,0.05)",
                              color: "#57cc99",
                            }}
                          >
                            Collection linked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="card-bottom">
                    <span className={`status-badge badge-${m.status}`}>
                      {m.status.toUpperCase()}
                    </span>
                    <div className="card-actions">
                      <button
                        className="btn-icon-only"
                        onClick={() => handleToggleActive(m._id)}
                        title={m.isActive ? "Pause Check" : "Resume Check"}
                      >
                        {m.isActive ? (
                          <FiPause size={15} />
                        ) : (
                          <FiPlay size={15} />
                        )}
                      </button>
                      <button
                        className="btn-icon-only"
                        onClick={() => handleOpenEditMonitor(m)}
                        title="Edit configuration"
                      >
                        <FiEdit3 size={15} />
                      </button>
                      <button
                        className="btn-icon-only btn-delete"
                        onClick={() => handleDeleteMonitor(m._id)}
                        title="Delete monitor"
                      >
                        <FiTrash2 size={15} />
                      </button>
                      <Link
                        to={`/api-monitors/${m._id}`}
                        className="btn-icon-only"
                        title="Inspect Run logs"
                        style={{ color: "var(--accent-color)" }}
                      >
                        <FiChevronRight size={18} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCollectionModal && (
        <div className="synthetic-modal-overlay">
          <div
            className="synthetic-modal-content"
            style={{ maxWidth: "700px" }}
          >
            <div className="synthetic-modal-header">
              <h2>
                {editingCollection
                  ? "Edit Collection Settings"
                  : "Create API Collection"}
              </h2>
              <button
                className="close-btn"
                onClick={() => setShowCollectionModal(false)}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCollection} className="synthetic-form">
              <div className="form-group">
                <label>Collection Name</label>
                <input
                  type="text"
                  placeholder="e.g. Production Microservices"
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <input
                  type="text"
                  placeholder="Shared environment for payment APIs"
                  value={colDesc}
                  onChange={(e) => setColDesc(e.target.value)}
                />
              </div>

              <div className="variables-section">
                <div className="variables-title-row">
                  <h4>Environment Variables</h4>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleAddColVariable}
                    style={{ padding: "4px 8px", fontSize: "11px" }}
                  >
                    + Add Variable
                  </button>
                </div>

                {colVars.length === 0 ? (
                  <p className="empty-variables-hint">
                    No collection variables defined yet. Define variables to
                    replace placeholders like <code>{"{{host}}"}</code> inside
                    request urls or headers.
                  </p>
                ) : (
                  <table className="keyvalue-table">
                    <thead>
                      <tr>
                        <th style={{ width: "35%" }}>Variable Key</th>
                        <th style={{ width: "45%" }}>Value</th>
                        <th style={{ width: "12%", textAlign: "center" }}>
                          Secure
                        </th>
                        <th style={{ width: "8%" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {colVars.map((v, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              type="text"
                              className="keyvalue-input"
                              placeholder="host"
                              value={v.key}
                              onChange={(e) =>
                                handleColVariableChange(
                                  i,
                                  "key",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type={v.isSecure ? "text" : "text"}
                              className="keyvalue-input"
                              placeholder={
                                v.isSecure ? "••••••••" : "https://api.site.com"
                              }
                              value={v.value}
                              onChange={(e) =>
                                handleColVariableChange(
                                  i,
                                  "value",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn-icon-only"
                              onClick={() =>
                                handleColVariableChange(
                                  i,
                                  "isSecure",
                                  !v.isSecure,
                                )
                              }
                              title={
                                v.isSecure
                                  ? "Make variable plaintext"
                                  : "Encrypt variable securely"
                              }
                            >
                              {v.isSecure ? (
                                <FiLock
                                  size={14}
                                  style={{ color: "#ffb703" }}
                                />
                              ) : (
                                <FiUnlock size={14} />
                              )}
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-icon-only btn-delete"
                              onClick={() => handleRemoveColVariable(i)}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCollectionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formLoading}
                >
                  {formLoading
                    ? "Saving..."
                    : editingCollection
                      ? "Save Changes"
                      : "Create Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMonitorModal && (
        <div className="synthetic-modal-overlay">
          <div
            className="synthetic-modal-content"
            style={{ maxWidth: "800px", height: "90vh" }}
          >
            <div className="synthetic-modal-header">
              <h2>
                {editingMonitor ? "Edit API Monitor" : "Create API Monitor"}
              </h2>
              <button
                className="close-btn"
                onClick={() => setShowMonitorModal(false)}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMonitor} className="synthetic-form">
              <div className="form-row">
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Monitor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Fetch user account verification API"
                    value={monName}
                    onChange={(e) => setMonName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: "0 0 140px" }}>
                  <label>Request Method</label>
                  <select
                    value={monMethod}
                    onChange={(e) => setMonMethod(e.target.value)}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="GRAPHQL">GraphQL</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: "1" }}>
                  <label>Request URL</label>
                  <input
                    type="text"
                    placeholder="e.g. {{host}}/users/profile"
                    value={monUrl}
                    onChange={(e) => setMonUrl(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Link to Collection (optional)</label>
                  <select
                    value={monCollectionId}
                    onChange={(e) => setMonCollectionId(e.target.value)}
                  >
                    <option value="">No Collection (Independent)</option>
                    {collections.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Check Interval</label>
                  <select
                    value={monInterval}
                    onChange={(e) => setMonInterval(Number(e.target.value))}
                  >
                    <option value={1}>Every 1 Minute</option>
                    <option value={5}>Every 5 Minutes</option>
                    <option value={10}>Every 10 Minutes</option>
                    <option value={15}>Every 15 Minutes</option>
                    <option value={30}>Every 30 Minutes</option>
                    <option value={60}>Hourly (60m)</option>
                  </select>
                </div>
              </div>

              <div className="variables-section">
                <div className="variables-title-row">
                  <h4>Custom Headers</h4>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleAddHeader}
                    style={{ padding: "4px 8px", fontSize: "11px" }}
                  >
                    + Add Header
                  </button>
                </div>
                {monHeaders.length === 0 ? (
                  <p className="empty-variables-hint">
                    No custom headers defined. Add header rows to include
                    Content-Type, Authorization, or custom API tokens.
                  </p>
                ) : (
                  <table className="keyvalue-table">
                    <thead>
                      <tr>
                        <th style={{ width: "35%" }}>Header Key</th>
                        <th style={{ width: "45%" }}>Header Value</th>
                        <th style={{ width: "12%", textAlign: "center" }}>
                          Secure
                        </th>
                        <th style={{ width: "8%" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {monHeaders.map((h, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              type="text"
                              className="keyvalue-input"
                              placeholder="Authorization"
                              value={h.key}
                              onChange={(e) =>
                                handleHeaderChange(i, "key", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="keyvalue-input"
                              placeholder={
                                h.isSecure ? "••••••••" : "Bearer {{token}}"
                              }
                              value={h.value}
                              onChange={(e) =>
                                handleHeaderChange(i, "value", e.target.value)
                              }
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn-icon-only"
                              onClick={() =>
                                handleHeaderChange(i, "isSecure", !h.isSecure)
                              }
                              title={
                                h.isSecure
                                  ? "Make header plaintext"
                                  : "Encrypt header value securely"
                              }
                            >
                              {h.isSecure ? (
                                <FiLock
                                  size={14}
                                  style={{ color: "#ffb703" }}
                                />
                              ) : (
                                <FiUnlock size={14} />
                              )}
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-icon-only btn-delete"
                              onClick={() => handleRemoveHeader(i)}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {monMethod !== "GET" && (
                <div className="form-group" style={{ marginTop: "16px" }}>
                  <label>
                    {monMethod === "GRAPHQL"
                      ? "GraphQL Query Payload"
                      : "Request Body Payload (JSON or text)"}
                  </label>
                  <textarea
                    className="graphql-editor"
                    placeholder={
                      monMethod === "GRAPHQL"
                        ? '{\n  query {\n    user(id: "{{userId}}") {\n      name\n    }\n  }\n}'
                        : '{\n  "name": "testing",\n  "active": true\n}'
                    }
                    value={monBody}
                    onChange={(e) => setMonBody(e.target.value)}
                  />
                </div>
              )}

              <div className="variables-section" style={{ marginTop: "16px" }}>
                <div className="variables-title-row">
                  <h4>Response Assertions Checks</h4>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleAddAssertion}
                    style={{ padding: "4px 8px", fontSize: "11px" }}
                  >
                    + Add Assertion
                  </button>
                </div>
                {monAssertions.length === 0 ? (
                  <p
                    className="empty-variables-hint"
                    style={{ color: "#ff4466" }}
                  >
                    Warning: Monitors with no assertions will always succeed as
                    long as the HTTP check connects successfully. Add assertions
                    to validate response payloads.
                  </p>
                ) : (
                  <div style={{ marginTop: "8px" }}>
                    {monAssertions.map((a, i) => (
                      <div className="assertion-row" key={i}>
                        <select
                          className="filter-select"
                          value={a.type}
                          onChange={(e) =>
                            handleAssertionChange(i, "type", e.target.value)
                          }
                        >
                          <option value="statusCode">Status Code</option>
                          <option value="responseTime">Latency (ms)</option>
                          <option value="jsonBody">JSON Path Value</option>
                          <option value="header">Header Value</option>
                          <option value="regex">Regex Matches Body</option>
                        </select>

                        {a.type === "jsonBody" || a.type === "header" ? (
                          <input
                            type="text"
                            className="keyvalue-input"
                            placeholder={
                              a.type === "jsonBody"
                                ? "users[0].name"
                                : "Content-Type"
                            }
                            value={a.property}
                            onChange={(e) =>
                              handleAssertionChange(
                                i,
                                "property",
                                e.target.value,
                              )
                            }
                            required
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              paddingLeft: "10px",
                            }}
                          >
                            N/A
                          </span>
                        )}

                        <select
                          className="filter-select"
                          value={a.operator}
                          onChange={(e) =>
                            handleAssertionChange(i, "operator", e.target.value)
                          }
                        >
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="greaterThan">Greater than</option>
                          <option value="lessThan">Less than</option>
                          <option value="notEquals">Not equals</option>
                        </select>

                        <input
                          type="text"
                          className="keyvalue-input"
                          placeholder="Expected target value"
                          value={a.target}
                          onChange={(e) =>
                            handleAssertionChange(i, "target", e.target.value)
                          }
                          required
                        />

                        <button
                          type="button"
                          className="btn-icon-only btn-delete"
                          onClick={() => handleRemoveAssertion(i)}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: "16px" }}>
                <label>Notifications Alert Options</label>
                <div className="alerts-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={monEmailAlert}
                      onChange={(e) => setMonEmailAlert(e.target.checked)}
                    />
                    Email Alarms
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={monInAppAlert}
                      onChange={(e) => setMonInAppAlert(e.target.checked)}
                    />
                    In-App Notification Logs
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={monWebhookAlert}
                      onChange={(e) => setMonWebhookAlert(e.target.checked)}
                    />
                    Post to Webhook URL
                  </label>
                </div>
              </div>

              {monWebhookAlert && (
                <div className="form-group">
                  <label>Webhook URL endpoint</label>
                  <input
                    type="text"
                    placeholder="https://yourserver.com/hooks/alert"
                    value={monWebhookUrl}
                    onChange={(e) => setMonWebhookUrl(e.target.value)}
                  />
                </div>
              )}

              <div className="form-row" style={{ paddingBottom: "24px" }}>
                <div className="form-group">
                  <label>Alert Cool-down (minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={monAlertCooldown}
                    onChange={(e) =>
                      setMonAlertCooldown(Number(e.target.value))
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Escalation Emails list (comma separated)</label>
                  <input
                    type="text"
                    placeholder="alerts@mycorp.com, devops@mycorp.com"
                    value={monEscalationEmails}
                    onChange={(e) => setMonEscalationEmails(e.target.value)}
                  />
                </div>
              </div>

              <div
                className="form-actions"
                style={{
                  borderTop: "1px solid #1e1e2f",
                  paddingTop: "16px",
                  background: "#0e0e16",
                  margin: "0 -32px",
                  paddingRight: "32px",
                  position: "sticky",
                  bottom: 0,
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowMonitorModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formLoading}
                >
                  {formLoading
                    ? "Saving..."
                    : editingMonitor
                      ? "Save Changes"
                      : "Create API Monitor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
