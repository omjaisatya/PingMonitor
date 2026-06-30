import { useState, useEffect } from "react";
import api from "../api/axios";
import { toast } from "../context/ToastContext";
import {
  FiX,
  FiActivity,
  FiTerminal,
  FiGlobe,
  FiAlertTriangle,
  FiCheck,
  FiSearch,
} from "react-icons/fi";
import "../styles/Synthetic.css";
import "../styles/Api.css";

const computeLineDiff = (oldText, newText) => {
  const oldLines = (oldText || "").split("\n");
  const newLines = (newText || "").split("\n");
  const diff = [];

  let i = 0,
    j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length) {
      if (oldLines[i] === newLines[j]) {
        diff.push({ type: "unchanged", value: oldLines[i] });
        i++;
        j++;
      } else {
        if (newLines.indexOf(oldLines[i], j) === -1) {
          diff.push({ type: "removed", value: oldLines[i] });
          i++;
        } else {
          diff.push({ type: "added", value: newLines[j] });
          j++;
        }
      }
    } else if (i < oldLines.length) {
      diff.push({ type: "removed", value: oldLines[i] });
      i++;
    } else {
      diff.push({ type: "added", value: newLines[j] });
      j++;
    }
  }
  return diff;
};

export default function ApiRunViewerModal({ runId, onClose }) {
  const [dataPackage, setDataPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("assertions"); // 'assertions' | 'request' | 'response' | 'diff'

  useEffect(() => {
    const fetchRunDetail = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api-monitors/runs/${runId}`);
        setDataPackage(data);
        if (data.run?.status === "failed") {
          setActiveTab("assertions");
        }
      } catch (err) {
        toast.error("Failed to load request execution details");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    if (runId) {
      fetchRunDetail();
    }
  }, [runId, onClose]);

  if (loading) {
    return (
      <div className="synthetic-modal-overlay">
        <div className="synthetic-modal-content modal-loading">
          <span className="spinner spinner-lg"></span>
          <p>Analyzing assertions metrics...</p>
        </div>
      </div>
    );
  }

  if (!dataPackage || !dataPackage.run) return null;

  const { run, previousResponseBody } = dataPackage;

  let prettyResponseBody = run.response?.body || "";
  try {
    const parsed = JSON.parse(prettyResponseBody);
    prettyResponseBody = JSON.stringify(parsed, null, 2);
  } catch (e) {}

  let prettyPreviousBody = previousResponseBody || "";
  try {
    const parsed = JSON.parse(prettyPreviousBody);
    prettyPreviousBody = JSON.stringify(parsed, null, 2);
  } catch (e) {}

  const textDiffs = computeLineDiff(prettyPreviousBody, prettyResponseBody);

  return (
    <div className="synthetic-modal-overlay">
      <div
        className="synthetic-modal-content"
        style={{ maxWidth: "950px", height: "85vh" }}
      >
        <div className="synthetic-modal-header">
          <div>
            <div className="modal-title-row">
              <h2>API Execution Run Detail</h2>
              <span className={`status-badge badge-${run.status}`}>
                {run.status.toUpperCase()}
              </span>
            </div>
            <p className="modal-subtitle">
              Executed on {new Date(run.startTime).toLocaleString()} • Latency:{" "}
              {run.response?.responseTime || run.duration}ms
            </p>
          </div>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="tab-header">
          <button
            className={`tab-btn ${activeTab === "assertions" ? "active" : ""}`}
            onClick={() => setActiveTab("assertions")}
          >
            <FiActivity style={{ marginRight: "6px" }} /> Assertions Check (
            {run.assertionResults?.length || 0})
          </button>
          <button
            className={`tab-btn ${activeTab === "request" ? "active" : ""}`}
            onClick={() => setActiveTab("request")}
          >
            <FiGlobe style={{ marginRight: "6px" }} /> Resolved Request
          </button>
          <button
            className={`tab-btn ${activeTab === "response" ? "active" : ""}`}
            onClick={() => setActiveTab("response")}
          >
            <FiTerminal style={{ marginRight: "6px" }} /> Response Payload
          </button>
          {prettyPreviousBody && (
            <button
              className={`tab-btn ${activeTab === "diff" ? "active" : ""}`}
              onClick={() => setActiveTab("diff")}
            >
              <FiSearch style={{ marginRight: "6px" }} /> Response Diff Viewer
            </button>
          )}
        </div>

        <div
          className="tab-content"
          style={{ overflowY: "auto", flex: 1, padding: "24px" }}
        >
          {activeTab === "assertions" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {run.assertionResults?.length === 0 ? (
                <p className="empty-variables-hint">
                  No assertions were configured for this monitor.
                </p>
              ) : (
                run.assertionResults.map((res, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      background: "var(--bg-input)",
                      border: `1px solid ${res.passed ? "var(--green-border)" : "var(--red-border)"}`,
                      borderRadius: "10px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "var(--text-primary)",
                          marginBottom: "4px",
                        }}
                      >
                        Assert{" "}
                        <code style={{ color: "var(--accent)", fontSize: "12.5px" }}>
                          {res.assertion.type}
                        </code>
                        {res.assertion.property &&
                          ` (${res.assertion.property})`}{" "}
                        {res.assertion.operator}{" "}
                        <code style={{ color: "var(--text-primary)" }}>{res.assertion.target}</code>
                      </div>
                      <div
                        style={{ fontSize: "12px", color: "var(--text-muted)" }}
                      >
                        Actual Evaluated Value:{" "}
                        <code
                          style={{ color: res.passed ? "var(--green)" : "var(--red)" }}
                        >
                          {res.actualValue}
                        </code>
                      </div>
                    </div>

                    <span
                      className={`status-badge badge-${res.passed ? "up" : "down"}`}
                    >
                      {res.passed ? "PASSED" : "FAILED"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "request" && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <span
                  className={`method-badge method-${run.request?.method?.toLowerCase()}`}
                >
                  {run.request?.method}
                </span>
                <code style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                  {run.request?.url}
                </code>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    margin: "0 0 8px 0",
                  }}
                >
                  Resolved Custom Headers
                </h4>
                {Object.keys(run.request?.headers || {}).length === 0 ? (
                  <p
                    style={{
                      fontStyle: "italic",
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                    }}
                  >
                    No request headers sent
                  </p>
                ) : (
                  <table className="keyvalue-table">
                    <tbody>
                      {Object.entries(run.request.headers).map(([key, val]) => (
                        <tr
                          key={key}
                          style={{
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <td
                            style={{
                              color: "var(--text-secondary)",
                              fontFamily: "var(--font-mono)",
                              fontSize: "12px",
                              width: "30%",
                            }}
                          >
                            {key}
                          </td>
                          <td
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "12px",
                              color: "var(--text-primary)",
                            }}
                          >
                            {String(val)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {run.request?.body && (
                <div>
                  <h4
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Resolved Request Body
                  </h4>
                  <pre
                    className="script-display-box"
                    style={{ borderRadius: "8px", maxHeight: "200px" }}
                  >
                    {run.request.body}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === "response" && (
            <div>
              <div
                style={{ display: "flex", gap: "24px", marginBottom: "20px" }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      display: "block",
                    }}
                  >
                    Status Code
                  </span>
                  <code
                    style={{
                      fontSize: "16px",
                      color: run.response?.status < 400 ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {run.response?.status || "Network error"}
                  </code>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      display: "block",
                    }}
                  >
                    Latency
                  </span>
                  <span
                    style={{
                      fontSize: "16px",
                      color: "var(--text-primary)",
                      fontWeight: "700",
                    }}
                  >
                    {run.response?.responseTime || run.duration}ms
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    margin: "0 0 8px 0",
                  }}
                >
                  Response Headers
                </h4>
                {Object.keys(run.response?.headers || {}).length === 0 ? (
                  <p
                    style={{
                      fontStyle: "italic",
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                    }}
                  >
                    No response headers returned
                  </p>
                ) : (
                  <table className="keyvalue-table">
                    <tbody>
                      {Object.entries(run.response.headers).map(
                        ([key, val]) => (
                          <tr
                            key={key}
                            style={{
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            <td
                              style={{
                                color: "var(--text-secondary)",
                                fontFamily: "var(--font-mono)",
                                fontSize: "12px",
                                width: "30%",
                              }}
                            >
                              {key}
                            </td>
                            <td
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "12px",
                                color: "var(--text-primary)",
                              }}
                            >
                              {String(val)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {prettyResponseBody && (
                <div>
                  <h4
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Response Body
                  </h4>
                  <pre
                    className="script-display-box"
                    style={{ borderRadius: "8px", maxHeight: "250px" }}
                  >
                    {prettyResponseBody}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === "diff" && prettyPreviousBody && (
            <div>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "12.5px",
                  margin: "0 0 16px 0",
                }}
              >
                Comparing current response payload against the previous
                successful run response. Green highlights indicate lines added,
                red highlights show lines removed.
              </p>

              <div className="diff-viewer-section">
                <div className="diff-header">
                  <h4>Response Diff (Git Unified Format)</h4>
                  <span className="card-interval">Line comparative</span>
                </div>
                <div className="diff-body">
                  {textDiffs.map((line, index) => (
                    <div key={index} className={`diff-line line-${line.type}`}>
                      {line.value || " "}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
