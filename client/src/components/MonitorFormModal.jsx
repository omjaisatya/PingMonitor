import { useState } from "react";

export default function MonitorFormModal({
  monitor,
  onClose,
  onSubmit,
  loading,
}) {
  const [monitorDraft, setMonitorDraft] = useState({
    name: monitor?.name ?? "",
    url: monitor?.url ?? "",
    interval: monitor?.interval ?? 10,
  });
  const [validationErr, setValidationErr] = useState("");

  const isEdit = !!monitor;

  const updateDraftField = (e) => {
    const { name, value } = e.target;
    setMonitorDraft((prevDraft) => ({ ...prevDraft, [name]: value }));
    setValidationErr("");
  };

  const submitMonitorPayload = async () => {
    const { name, url, interval } = monitorDraft;

    if (!name.trim() || !url.trim()) {
      setValidationErr("Name and URL are required");
      return;
    }

    try {
      // quick sniff test for malformed URLs before we hit the API
      new URL(url);
    } catch (err) {
      console.error("MonitorFormModal URL validation failed ->", err);
      setValidationErr("Please enter a valid URL (e.g. https://example.com)");
      return;
    }

    await onSubmit({ ...monitorDraft, interval: Number(interval) });
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <h2 className="modal-title">
          {isEdit ? "✏️ Edit Monitor" : "＋ New Monitor"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="form-group">
            <label className="form-label">Monitor Name</label>
            <input
              className="form-input"
              name="name"
              placeholder="My Production API"
              value={monitorDraft.name}
              onChange={updateDraftField}
            />
          </div>

          <div className="form-group">
            <label className="form-label">URL to Monitor</label>
            <input
              className="form-input"
              name="url"
              placeholder="https://api.myapp.com/health"
              value={monitorDraft.url}
              onChange={updateDraftField}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Check Interval (minutes)</label>
            <input
              className="form-input"
              name="interval"
              type="number"
              min="1"
              max="60"
              value={monitorDraft.interval}
              onChange={updateDraftField}
            />
          </div>

          {validationErr && (
            <div className="alert alert-error">{validationErr}</div>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submitMonitorPayload}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> Saving...
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Monitor"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
