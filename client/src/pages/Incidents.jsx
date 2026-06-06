import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { toast } from "../context/ToastContext";
import { MarkdownBlock } from "../utils/markdown";
import { useWebSocket } from "../hook/useWebSocket";
import "../styles/Incidents.css";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiMail,
  FiMessageSquare,
  FiPlus,
  FiRadio,
  FiSave,
  FiSliders,
} from "react-icons/fi";

const states = ["investigating", "identified", "monitoring", "resolved"];
const severities = ["minor", "major", "critical"];
const initialRca = { cause: "", impact: "", resolution: "", prevention: "" };
const initialForm = {
  title: "",
  summary: "",
  severity: "major",
  state: "investigating",
  monitorIds: [],
  isPublic: false,
  emailSubscribers: "",
};

const splitEmails = (value) =>
  String(value || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not set";

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [rules, setRules] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [comment, setComment] = useState("");
  const [publicComment, setPublicComment] = useState(false);
  const [rca, setRca] = useState(initialRca);
  const [ruleDraft, setRuleDraft] = useState({
    name: "Default monitor failure automation",
    enabled: true,
    failureThreshold: 1,
    autoCreateIncident: true,
    autoResolveIncident: true,
    autoResolveAfterRecoveries: 1,
    defaultSeverity: "major",
    publishToStatusPage: false,
    notifyByEmail: true,
    subscriberEmails: "",
  });

  const [visibleTimelineItems, setVisibleTimelineItems] = useState(20);
  const timelineLoaderRef = useRef(null);

  const selectedMonitorIds = useMemo(
    () =>
      new Set(
        (selected?.affectedServices || []).map((service) =>
          String(service.monitorId?._id || service.monitorId),
        ),
      ),
    [selected],
  );

  const reversedTimeline = useMemo(() => {
    return (selected?.timeline || []).slice().reverse();
  }, [selected?.timeline]);

  const fetchIncidents = useCallback(async () => {
    try {
      const { data } = await api.get(`/incidents?state=${filter}`);
      const list = data.incidents || [];
      setIncidents(list);
      setSelected((current) =>
        current
          ? list.find((item) => item._id === current._id) || list[0] || null
          : list[0] || null,
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const handleSelectIncident = (incident) => {
    setSelected(incident);
    setVisibleTimelineItems(20);
    if (window.innerWidth <= 980) {
      setTimeout(() => {
        const detailPanel = document.querySelector(".incident-detail-panel");
        if (detailPanel) {
          detailPanel.scrollIntoView({ behavior: "smooth" });
        }
      }, 50);
    }
  };

  const fetchSetupData = useCallback(async () => {
    try {
      const [monitorRes, ruleRes] = await Promise.all([
        api.get("/monitors?limit=100"),
        api.get("/incidents/automation-rules"),
      ]);
      setMonitors(monitorRes.data?.allMonitors || []);
      const nextRules = ruleRes.data?.rules || [];
      setRules(nextRules);
      if (nextRules[0]) {
        setRuleDraft({
          ...nextRules[0],
          subscriberEmails: (nextRules[0].subscriberEmails || []).join(", "),
        });
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load incident setup",
      );
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    fetchSetupData();
  }, [fetchSetupData]);

  useWebSocket((event) => {
    if (
      event === "incident:created" ||
      event === "incident:updated" ||
      event === "incident:resolved"
    ) {
      fetchIncidents();
    }
  });

  useEffect(() => {
    setRca({
      cause: selected?.rootCauseAnalysis?.cause || "",
      impact: selected?.rootCauseAnalysis?.impact || "",
      resolution: selected?.rootCauseAnalysis?.resolution || "",
      prevention: selected?.rootCauseAnalysis?.prevention || "",
    });
  }, [selected]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (
          firstEntry.isIntersecting &&
          reversedTimeline.length > visibleTimelineItems
        ) {
          setVisibleTimelineItems((prev) => prev + 20);
        }
      },
      { threshold: 0.1 },
    );

    const currentLoader = timelineLoaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [timelineLoaderRef, reversedTimeline.length, visibleTimelineItems]);

  const createIncident = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/incidents", {
        ...form,
        emailSubscribers: splitEmails(form.emailSubscribers),
      });
      setForm(initialForm);
      setSelected(data.incident);
      await fetchIncidents();
      setShowCreateForm(false);
      toast.success("Incident created");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create incident");
    } finally {
      setSaving(false);
    }
  };

  const updateSelected = async (patch) => {
    if (!selected) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/incidents/${selected._id}`, patch);
      setSelected(data.incident);
      await fetchIncidents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update incident");
    } finally {
      setSaving(false);
    }
  };

  const addComment = async (event) => {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/incidents/${selected._id}/comments`, {
        body: comment,
        isInternal: !publicComment,
      });
      setComment("");
      setPublicComment(false);
      setSelected(data.incident);
      await fetchIncidents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add comment");
    } finally {
      setSaving(false);
    }
  };

  const saveRca = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/incidents/${selected._id}/rca`, rca);
      setSelected(data.incident);
      await fetchIncidents();
      toast.success("RCA saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save RCA");
    } finally {
      setSaving(false);
    }
  };

  const saveServices = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const monitorIds = monitors
        .filter((monitor) => selectedMonitorIds.has(String(monitor._id)))
        .map((monitor) => monitor._id);
      const { data } = await api.patch(`/incidents/${selected._id}/services`, {
        monitorIds,
      });
      setSelected(data.incident);
      await fetchIncidents();
      toast.success("Affected services saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save services");
    } finally {
      setSaving(false);
    }
  };

  const sendEmailUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { data } = await api.post(
        `/incidents/${selected._id}/email-updates`,
      );
      setSelected(data.incident);
      await fetchIncidents();
      toast.success("Email update sent");
    } catch (err) {
      toast.error(err.response?.data?.message || "No recipients configured");
    } finally {
      setSaving(false);
    }
  };

  const saveRule = async () => {
    setSaving(true);
    try {
      const id = rules[0]?._id;
      const endpoint = id
        ? `/incidents/automation-rules/${id}`
        : "/incidents/automation-rules";
      const method = id ? "put" : "post";
      const { data } = await api[method](endpoint, {
        ...ruleDraft,
        subscriberEmails: splitEmails(ruleDraft.subscriberEmails),
      });
      setRules([data.rule]);
      toast.success("Automation rule saved");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save automation rule",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleFormMonitor = (id) => {
    setForm((prev) => ({
      ...prev,
      monitorIds: prev.monitorIds.includes(id)
        ? prev.monitorIds.filter((item) => item !== id)
        : [...prev.monitorIds, id],
    }));
  };

  const toggleSelectedService = (id) => {
    if (!selected) return;
    const next = new Set(selectedMonitorIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected({
      ...selected,
      affectedServices: monitors
        .filter((monitor) => next.has(String(monitor._id)))
        .map((monitor) => ({
          monitorId: monitor,
          name: monitor.name,
          url: monitor.url,
          statusAtImpact: monitor.status,
        })),
    });
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content incidents-page">
        <div className="dashboard-header">
          <div>
            <h1 className="page-title">Incidents</h1>
            <p className="page-subtitle">
              Manage response, RCA, automation, email updates, and status-page
              history
            </p>
          </div>
          <div className="incident-live-pill">
            <FiRadio size={14} /> Websocket live
          </div>
        </div>

        <div className="incident-tabs">
          {["open", "all", ...states].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item.replace("_", " ")}
            </button>
          ))}
        </div>

        <section className="incident-layout">
          {/* LEFT PANEL - INCIDENT LIST */}
          <aside className="incident-list-panel">
            <div
              className="incident-create-toggle"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <FiPlus /> New Incident
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {showCreateForm ? "Hide" : "Show"}
              </span>
            </div>

            {showCreateForm && (
              <form className="incident-create" onSubmit={createIncident}>
                <input
                  placeholder="Incident title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
                <textarea
                  placeholder="Summary supports markdown"
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                />
                <div className="incident-row">
                  <select
                    value={form.severity}
                    onChange={(e) =>
                      setForm({ ...form, severity: e.target.value })
                    }
                  >
                    {severities.map((severity) => (
                      <option key={severity}>{severity}</option>
                    ))}
                  </select>
                  <select
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value })
                    }
                  >
                    {states.map((state) => (
                      <option key={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <input
                  placeholder="Subscribers, comma separated"
                  value={form.emailSubscribers}
                  onChange={(e) =>
                    setForm({ ...form, emailSubscribers: e.target.value })
                  }
                />
                <div className="incident-service-picker">
                  {monitors.map((monitor) => (
                    <label key={monitor._id}>
                      <input
                        type="checkbox"
                        checked={form.monitorIds.includes(monitor._id)}
                        onChange={() => toggleFormMonitor(monitor._id)}
                      />
                      <span>{monitor.name}</span>
                    </label>
                  ))}
                </div>
                <label className="incident-check">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) =>
                      setForm({ ...form, isPublic: e.target.checked })
                    }
                  />
                  Publish on status page
                </label>
                <button className="btn btn-primary" disabled={saving}>
                  <FiSave /> Create Incident
                </button>
              </form>
            )}

            <div className="incident-list">
              {loading && (
                <div className="incident-empty">Loading incidents...</div>
              )}
              {!loading && incidents.length === 0 && (
                <div className="incident-empty">
                  No incidents match this view.
                </div>
              )}
              {incidents.map((incident) => (
                <button
                  key={incident._id}
                  className={`incident-list-item ${
                    selected?._id === incident._id ? "active" : ""
                  }`}
                  onClick={() => handleSelectIncident(incident)}
                >
                  <span className={`incident-severity ${incident.severity}`} />
                  <strong>{incident.title}</strong>
                  <small>
                    {incident.state} · {formatDate(incident.startedAt)}
                  </small>
                </button>
              ))}
            </div>
          </aside>

          {/* RIGHT PANEL - DETAIL & AUTOMATION */}
          <div className="incident-main-view">
            <section className="incident-detail-panel">
              {!selected ? (
                <div className="incident-empty large">
                  <FiAlertTriangle size={28} /> Select or create an incident.
                </div>
              ) : (
                <>
                  <div className="incident-detail-header">
                    <div>
                      <div className={`incident-state-pill ${selected.state}`}>
                        {selected.state === "resolved" ? (
                          <FiCheckCircle />
                        ) : (
                          <FiClock />
                        )}
                        {selected.state}
                      </div>
                      <h2>{selected.title}</h2>
                      <MarkdownBlock
                        value={selected.summary || "No summary yet."}
                      />
                    </div>
                    <div className="incident-header-actions">
                      <button
                        className="btn btn-outline"
                        onClick={sendEmailUpdate}
                        disabled={saving}
                      >
                        <FiMail /> Email update
                      </button>
                    </div>
                  </div>

                  {/* SPLIT CONTENT & METADATA */}
                  <div className="incident-split-view">
                    {/* LEFT COLUMN: Main Content (RCA & Comments) */}
                    <div className="incident-content-col">
                      <div className="incident-section">
                        <div className="incident-panel-title">
                          <FiEdit3 /> Root Cause Analysis
                        </div>
                        <div className="incident-rca-grid">
                          {Object.keys(initialRca).map((field) => (
                            <label key={field}>
                              {field}
                              <textarea
                                value={rca[field]}
                                onChange={(e) =>
                                  setRca({ ...rca, [field]: e.target.value })
                                }
                                placeholder={`Describe ${field} (markdown)`}
                              />
                            </label>
                          ))}
                        </div>
                        <div style={{ marginTop: "12px", textAlign: "right" }}>
                          <button
                            className="btn btn-outline"
                            onClick={saveRca}
                            disabled={saving}
                          >
                            <FiSave /> Save RCA
                          </button>
                        </div>
                      </div>

                      <div className="incident-section">
                        <div className="incident-panel-title">
                          <FiMessageSquare /> Team Comments
                        </div>
                        <form
                          className="incident-comment-form"
                          onSubmit={addComment}
                        >
                          <textarea
                            placeholder="Write a markdown comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                          />
                          <div className="incident-comment-actions">
                            <label className="incident-check">
                              <input
                                type="checkbox"
                                checked={publicComment}
                                onChange={(e) =>
                                  setPublicComment(e.target.checked)
                                }
                              />
                              Public update
                            </label>
                            <button
                              className="btn btn-primary"
                              disabled={saving || !comment.trim()}
                            >
                              Add Comment
                            </button>
                          </div>
                        </form>
                        <div className="incident-comments">
                          {(selected.comments || [])
                            .slice()
                            .reverse()
                            .map((item) => (
                              <article
                                key={item._id}
                                className="incident-comment"
                              >
                                <div>
                                  <strong>
                                    {item.authorId?.name ||
                                      item.authorId?.email ||
                                      "Team member"}
                                  </strong>
                                  <span>
                                    {item.isInternal ? "Internal" : "Public"} ·{" "}
                                    {formatDate(item.createdAt)}
                                  </span>
                                </div>
                                <MarkdownBlock value={item.body} />
                              </article>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Metadata (Properties, Services, Timeline) */}
                    <aside className="incident-sidebar-col">
                      <div className="incident-section">
                        <div className="incident-panel-title">Properties</div>
                        <div className="incident-sidebar-controls">
                          <label>
                            State
                            <select
                              value={selected.state}
                              onChange={(e) =>
                                updateSelected({ state: e.target.value })
                              }
                            >
                              {states.map((state) => (
                                <option key={state}>{state}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Severity
                            <select
                              value={selected.severity}
                              onChange={(e) =>
                                updateSelected({ severity: e.target.value })
                              }
                            >
                              {severities.map((severity) => (
                                <option key={severity}>{severity}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Visibility
                            <select
                              value={selected.isPublic ? "public" : "private"}
                              onChange={(e) =>
                                updateSelected({
                                  isPublic: e.target.value === "public",
                                })
                              }
                            >
                              <option value="public">Public status page</option>
                              <option value="private">Private only</option>
                            </select>
                          </label>
                        </div>
                      </div>

                      <div className="incident-section">
                        <div className="incident-panel-title">
                          <FiAlertTriangle /> Affected Services
                        </div>
                        <div className="incident-service-picker wide">
                          {monitors.map((monitor) => (
                            <label key={monitor._id}>
                              <input
                                type="checkbox"
                                checked={selectedMonitorIds.has(
                                  String(monitor._id),
                                )}
                                onChange={() =>
                                  toggleSelectedService(monitor._id)
                                }
                              />
                              <span>{monitor.name}</span>
                            </label>
                          ))}
                        </div>
                        <button
                          className="btn btn-outline"
                          onClick={saveServices}
                          disabled={saving}
                          style={{ width: "100%" }}
                        >
                          <FiSave /> Save services
                        </button>
                      </div>

                      <div className="incident-section">
                        <div className="incident-panel-title">
                          <FiClock /> Timeline
                        </div>
                        <div className="incident-timeline-wrapper">
                          <div className="incident-timeline">
                            {reversedTimeline
                              .slice(0, visibleTimelineItems)
                              .map((item) => (
                                <div
                                  key={item._id || item.createdAt}
                                  className="incident-timeline-item"
                                >
                                  <span />
                                  <div>
                                    <strong>
                                      {item.type.replace(/_/g, " ")}
                                    </strong>
                                    <p>{item.message}</p>
                                    <small>{formatDate(item.createdAt)}</small>
                                  </div>
                                </div>
                              ))}
                            {reversedTimeline.length > visibleTimelineItems && (
                              <div
                                ref={timelineLoaderRef}
                                className="timeline-loader"
                              >
                                Loading more...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                </>
              )}
            </section>

            {/* AUTOMATION SECTION (Placed globally below the detail grid) */}
            <section className="incident-automation">
              <div className="incident-panel-title">
                <FiSliders /> Global Automation Settings
              </div>
              <p className="incident-help-text">
                Configure automatic incident generation based on monitor
                failures.
              </p>

              <div className="incident-control-grid">
                <label>
                  Rule name
                  <input
                    value={ruleDraft.name}
                    onChange={(e) =>
                      setRuleDraft({ ...ruleDraft, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Failure threshold
                  <input
                    type="number"
                    min="1"
                    value={ruleDraft.failureThreshold}
                    onChange={(e) =>
                      setRuleDraft({
                        ...ruleDraft,
                        failureThreshold: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Auto-resolve recoveries
                  <input
                    type="number"
                    min="1"
                    value={ruleDraft.autoResolveAfterRecoveries}
                    onChange={(e) =>
                      setRuleDraft({
                        ...ruleDraft,
                        autoResolveAfterRecoveries: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Default severity
                  <select
                    value={ruleDraft.defaultSeverity}
                    onChange={(e) =>
                      setRuleDraft({
                        ...ruleDraft,
                        defaultSeverity: e.target.value,
                      })
                    }
                  >
                    {severities.map((severity) => (
                      <option key={severity}>{severity}</option>
                    ))}
                  </select>
                </label>
              </div>

              <input
                className="incident-full-input"
                placeholder="Automation subscriber emails, comma separated"
                value={ruleDraft.subscriberEmails}
                onChange={(e) =>
                  setRuleDraft({
                    ...ruleDraft,
                    subscriberEmails: e.target.value,
                  })
                }
              />
              <div className="incident-toggle-row">
                {[
                  ["enabled", "Rule Enabled"],
                  ["autoCreateIncident", "Auto-create"],
                  ["autoResolveIncident", "Auto-resolve"],
                  ["publishToStatusPage", "Status page"],
                  ["notifyByEmail", "Email updates"],
                ].map(([key, label]) => (
                  <label key={key} className="incident-check">
                    <input
                      type="checkbox"
                      checked={!!ruleDraft[key]}
                      onChange={(e) =>
                        setRuleDraft({ ...ruleDraft, [key]: e.target.checked })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <button
                className="btn btn-outline"
                onClick={saveRule}
                disabled={saving}
              >
                <FiSave /> Save automation rules
              </button>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
