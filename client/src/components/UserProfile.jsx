// components/UserProfile.jsx
import { useState, useMemo, useEffect } from "react";
import { toast } from "../context/ToastContext";
import { useAuth } from "../hook/useAuth";
import apiClient from "../api/axios";
import "../styles/UserProfile.css";
import Navbar from "./Navbar";
import { FiUser, FiShield, FiSliders, FiSettings, FiActivity } from "react-icons/fi";

const scorePassword = (password) => {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { label: "", color: "" },
    { label: "Weak", color: "#e24b4a" },
    { label: "Fair", color: "#ef9f27" },
    { label: "Good", color: "#639922" },
    { label: "Strong", color: "#1d9e75" },
    { label: "Very strong", color: "#1d9e75" },
  ];
  return { score, ...levels[score] };
};

const PasswordStrengthBar = ({ password }) => {
  const { score, label, color } = useMemo(
    () => scorePassword(password),
    [password],
  );
  if (!password) return null;
  return (
    <div className="strength-bar">
      <div className="strength-bar__tracks">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="strength-bar__track"
            style={{
              backgroundColor: i <= score ? color : undefined,
              opacity: i <= score ? 1 : 0.15,
            }}
          />
        ))}
      </div>
      {label && (
        <span className="strength-bar__label" style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
};

const SectionCard = ({ title, subtitle, icon, children, danger }) => (
  <div className={`profile-section ${danger ? "profile-section--danger" : ""}`}>
    <div className="profile-section__header">
      <span className="profile-section__icon">{icon}</span>
      <div>
        <h3 className="profile-section__title">{title}</h3>
        {subtitle && <p className="profile-section__subtitle">{subtitle}</p>}
      </div>
    </div>
    <div className="profile-section__body">{children}</div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div className="profile-field">
    <label className="profile-field__label">{label}</label>
    {children}
    {hint && <p className="profile-field__hint">{hint}</p>}
  </div>
);

const PasswordInput = ({ value, onChange, placeholder, autoComplete }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input
        className="profile-input"
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="input-eye"
        onClick={() => setShow((p) => !p)}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
};

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
  requireText,
}) => {
  const [typed, setTyped] = useState("");
  if (!isOpen) return null;
  const canConfirm = !requireText || typed === requireText;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">{title}</h3>
        <p className="modal__message">{message}</p>
        {requireText && (
          <div className="profile-field" style={{ marginTop: "16px" }}>
            <label className="profile-field__label">
              Type <strong>{requireText}</strong> to confirm
            </label>
            <input
              className="profile-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
              autoComplete="off"
            />
          </div>
        )}
        <div className="modal__actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfileInfo = ({ user }) => (
  <SectionCard title="Account Info" subtitle="Your current account details" icon={<FiUser />}>
    <div className="info-grid">
      <div className="info-item">
        <span className="info-item__label">Name</span>
        <span className="info-item__value">{user?.name || "—"}</span>
      </div>
      <div className="info-item">
        <span className="info-item__label">Email</span>
        <span className="info-item__value">{user?.email || "—"}</span>
      </div>
      <div className="info-item">
        <span className="info-item__label">Member since</span>
        <span className="info-item__value">
          {user?.createdAt
            ? new Date(user.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "—"}
        </span>
      </div>
    </div>
  </SectionCard>
);

const ChangeName = ({ user, onUpdate }) => {
  const [name, setName] = useState(user?.name || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Name cannot be empty");
    if (trimmed === user?.name) return toast.info("No changes to save");
    if (trimmed.length < 2)
      return toast.error("Name must be at least 2 characters");

    setLoading(true);
    try {
      const { data } = await apiClient.patch("/auth/profile/name", {
        name: trimmed,
      });
      toast.success("Name updated successfully");
      onUpdate({ name: data.name });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update name");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Display Name" subtitle="Update how your name appears" icon={<FiSettings />}>
      <form onSubmit={handleSubmit}>
        <Field label="Full name">
          <input
            className="profile-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            maxLength={60}
          />
        </Field>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading || name.trim() === user?.name}
        >
          {loading ? "Saving..." : "Save name"}
        </button>
      </form>
    </SectionCard>
  );
};

const ChangeEmail = ({ user, onUpdate, logout }) => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = form;
    if (!email || !password) return toast.error("All fields are required");
    if (email === user?.email) return toast.info("That's already your email");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return toast.error("Invalid email address");

    setLoading(true);
    try {
      await apiClient.patch("/auth/profile/email", { email, password });
      toast.success("Email updated — signing you out");
      onUpdate({ email });
      await logout();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      title="Email Address"
      subtitle="Changing your email will sign you out"
      icon={<FiShield />}
    >
      <form onSubmit={handleSubmit}>
        <Field label="New email address">
          <input
            className="profile-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="new@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Current password" hint="Required to confirm this change">
          <PasswordInput
            value={form.password}
            onChange={(e) =>
              setForm((p) => ({ ...p, password: e.target.value }))
            }
            placeholder="Your current password"
            autoComplete="current-password"
          />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update email"}
        </button>
      </form>
    </SectionCard>
  );
};

const ChangePassword = ({ logout }) => {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const mismatch = form.confirm && form.next !== form.confirm;
  const strength = useMemo(() => scorePassword(form.next), [form.next]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { current, next, confirm } = form;
    if (!current || !next || !confirm)
      return toast.error("All fields are required");
    if (next.length < 8)
      return toast.error("New password must be at least 8 characters");
    if (next !== confirm) return toast.error("Passwords don't match");
    if (current === next)
      return toast.error("New password must differ from current");
    if (strength.score < 3)
      return toast.error("Please choose a stronger password");

    setLoading(true);
    try {
      await apiClient.post("/auth/change-password", {
        currentPassword: current,
        newPassword: next,
      });
      toast.success("Password changed — signing you out");
      await logout();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      title="Password"
      subtitle="Use a strong, unique password"
      icon={<FiShield />}
    >
      <form onSubmit={handleSubmit}>
        <Field label="Current password">
          <PasswordInput
            value={form.current}
            onChange={(e) =>
              setForm((p) => ({ ...p, current: e.target.value }))
            }
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </Field>
        <Field label="New password">
          <PasswordInput
            value={form.next}
            onChange={(e) => setForm((p) => ({ ...p, next: e.target.value }))}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
        </Field>
        <PasswordStrengthBar password={form.next} />
        <Field label="Confirm new password">
          <PasswordInput
            value={form.confirm}
            onChange={(e) =>
              setForm((p) => ({ ...p, confirm: e.target.value }))
            }
            placeholder="Repeat new password"
            autoComplete="new-password"
          />
        </Field>
        {mismatch && <p className="field-error">Passwords don't match</p>}
        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading || !!mismatch}
        >
          {loading ? "Updating..." : "Change password"}
        </button>
      </form>
    </SectionCard>
  );
};

const DeactivateAccount = ({ logout }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      await apiClient.patch("/auth/profile/deactivate");
      toast.info("Account deactivated — you've been signed out");
      setModalOpen(false);
      setTimeout(() => logout(), 1000);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to deactivate account",
      );
      setLoading(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Deactivate Account"
        subtitle="Temporarily disable your account"
        icon={<FiSliders />}
      >
        <p className="danger-description">
          Your account and data will be preserved. You can reactivate at any
          time by signing back in.
        </p>
        <button className="btn btn-warning" onClick={() => setModalOpen(true)}>
          Deactivate account
        </button>
      </SectionCard>
      <ConfirmModal
        isOpen={modalOpen}
        title="Deactivate your account?"
        message="Your monitors will be paused and your account hidden. Sign in anytime to restore full access."
        confirmLabel={loading ? "Deactivating..." : "Yes, deactivate"}
        onConfirm={handleDeactivate}
        onCancel={() => setModalOpen(false)}
      />
    </>
  );
};

const DeleteAccount = ({ logout }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await apiClient.delete("/auth/profile/delete");
      toast.error("Account permanently deleted");
      setModalOpen(false);
      setTimeout(() => logout(), 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete account");
      setLoading(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Delete Account"
        subtitle="Permanently remove your account and all data"
        icon={<FiSliders />}
        danger
      >
        <p className="danger-description">
          This is irreversible. All your monitors, history, and account data
          will be permanently erased with no way to recover them.
        </p>
        <button className="btn btn-danger" onClick={() => setModalOpen(true)}>
          Delete my account
        </button>
      </SectionCard>
      <ConfirmModal
        isOpen={modalOpen}
        title="Permanently delete account?"
        message="All your data — monitors, history, settings — will be destroyed forever. This cannot be undone."
        confirmLabel={loading ? "Deleting..." : "Delete permanently"}
        onConfirm={handleDelete}
        onCancel={() => setModalOpen(false)}
        danger
        requireText="DELETE"
      />
    </>
  );
};

const StatusPageSettings = ({ user, onUpdate }) => {
  const [enabled, setEnabled] = useState(user?.statusPageEnabled ?? true);
  const [title, setTitle] = useState(user?.statusPageTitle || "System Status");
  const [desc, setDesc] = useState(user?.statusPageDescription || "Live status of our services.");
  const [slug, setSlug] = useState(user?.statusPageSlug || "");
  const [saving, setSaving] = useState(false);

  const [monitors, setMonitors] = useState([]);
  const [loadingMons, setLoadingMons] = useState(false);

  useEffect(() => {
    const fetchMonitors = async () => {
      setLoadingMons(true);
      try {
        const { data } = await apiClient.get("/monitors");
        setMonitors(data.allMonitors || data.monitors || (Array.isArray(data) ? data : []));
      } catch (err) {
        console.error("Error loading monitors:", err);
      } finally {
        setLoadingMons(false);
      }
    };
    fetchMonitors();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await apiClient.patch("/auth/profile/status-page", {
        statusPageEnabled: enabled,
        statusPageTitle: title,
        statusPageDescription: desc,
        statusPageSlug: slug.trim(),
      });
      toast.success("Status page settings updated!");
      onUpdate(data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const currentSlugOrId = user?.statusPageSlug || user?.id || user?._id;
  const publicUrl = `${window.location.origin}/status/${currentSlugOrId}`;
  const iframeCode = `<iframe src="${publicUrl}?embed=true" width="100%" height="450" style="border:none;border-radius:12px;background:transparent;"></iframe>`;
  
  const serverBase = import.meta.env.VITE_SERVER_URL;
  const userBadgeUrl = `${serverBase}/public/badge-user/${currentSlugOrId}`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <SectionCard title="Status Page Configuration" subtitle="Configure your public status dashboard" icon={<FiActivity />}>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
            <label className="switch" style={{ position: "relative", display: "inline-block", width: "40px", height: "20px", flexShrink: 0 }}>
              <input 
                type="checkbox" 
                checked={enabled} 
                onChange={(e) => setEnabled(e.target.checked)} 
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span className="slider round" style={{
                position: "absolute",
                cursor: "pointer",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: enabled ? "var(--green, #1d9e75)" : "#444",
                transition: ".4s",
                borderRadius: "20px"
              }}>
                <span style={{
                  position: "absolute",
                  content: "",
                  height: "14px",
                  width: "14px",
                  left: enabled ? "22px" : "4px",
                  bottom: "3px",
                  backgroundColor: "white",
                  transition: ".4s",
                  borderRadius: "50%"
                }} />
              </span>
            </label>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
              {enabled ? "Public Status Page Enabled" : "Public Status Page Disabled"}
            </span>
          </div>

          <Field label="Status Page Title" hint="Display title on the public page">
            <input
              className="profile-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Acme Corp System Status"
              required
            />
          </Field>

          <Field label="Status Page Description" hint="Brief explanation of your status updates">
            <textarea
              className="profile-input"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Live status of Acme Corp APIs and websites."
              rows={3}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>

          <Field 
            label="Custom Page Slug" 
            hint="Set a custom path segment. Leave empty to use your default account ID."
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                /status/
              </span>
              <input
                className="profile-input"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                placeholder="e.g. acme-status"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
          </Field>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving settings..." : "Save Status Settings"}
          </button>
        </form>
      </SectionCard>

      {enabled && (
        <>
          <SectionCard title="Sharing & Embed Widgets" subtitle="Use these links and elements to attach status reports" icon={<FiSettings />}>
            
            <Field label="Public Status Link" hint="Direct link to your unauthenticated status page">
              <div style={{ display: "flex", gap: "8px" }}>
                <input className="profile-input" readOnly value={publicUrl} style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }} onClick={(e) => e.target.select()} />
                <button type="button" className="btn btn-ghost" style={{ padding: "0 14px", flexShrink: 0 }} onClick={() => copyToClipboard(publicUrl, "Link")}>
                  Copy
                </button>
                <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: "10px 14px", flexShrink: 0, textDecoration: "none" }}>
                  Visit
                </a>
              </div>
            </Field>

            <Field label="Iframe Embed Snippet" hint="Paste this HTML into your website's body">
              <div style={{ display: "flex", gap: "8px" }}>
                <input className="profile-input" readOnly value={iframeCode} style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }} onClick={(e) => e.target.select()} />
                <button type="button" className="btn btn-ghost" style={{ padding: "0 14px", flexShrink: 0 }} onClick={() => copyToClipboard(iframeCode, "Iframe Code")}>
                  Copy
                </button>
              </div>
            </Field>

          </SectionCard>

          <SectionCard title="Status Badge Previews" subtitle="Live SVG badges to embed in README files or sites" icon={<FiActivity />}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "16px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)" }}>
                  Overall Account Status
                </h4>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.1)", display: "inline-flex", alignItems: "center", minHeight: "42px" }}>
                    <img src={`${userBadgeUrl}?t=${Date.now()}`} alt="Overall status badge" key={user?.statusPageSlug || user?._id} style={{ display: "block" }} />
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" className="btn btn-ghost" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={() => copyToClipboard(`![System Status](${userBadgeUrl})`, "Markdown Badge")}>
                      Markdown
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={() => copyToClipboard(`<img src="${userBadgeUrl}" alt="System Status" />`, "HTML Badge")}>
                      HTML
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", color: "var(--text-secondary)" }}>
                  Individual Monitor Badges
                </h4>
                
                {loadingMons ? (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "10px 0" }}>Loading monitors list...</div>
                ) : monitors.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "10px 0" }}>No monitors configured to create badges.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {monitors.map((mon) => {
                      const monBadgeUrl = `${serverBase}/public/badge/${mon._id}`;
                      return (
                        <div key={mon._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "10px" }}>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{mon.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{mon.url}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ background: "rgba(0,0,0,0.15)", padding: "4px 8px", borderRadius: "4px", display: "inline-flex" }}>
                              <img src={monBadgeUrl} alt={`${mon.name} status badge`} style={{ height: "20px" }} />
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button type="button" className="btn btn-ghost" style={{ fontSize: "11px", padding: "4px 8px" }} onClick={() => copyToClipboard(`![${mon.name} Status](${monBadgeUrl})`, "Markdown Badge")}>
                                MD
                              </button>
                              <button type="button" className="btn btn-ghost" style={{ fontSize: "11px", padding: "4px 8px" }} onClick={() => copyToClipboard(`<img src="${monBadgeUrl}" alt="${mon.name} Status" />`, "HTML Badge")}>
                                HTML
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </SectionCard>
        </>
      )}
    </div>
  );
};

const TABS = [
  { id: "profile", label: "Profile", icon: FiUser },
  { id: "security", label: "Security", icon: FiShield },
  { id: "statuspage", label: "Status Page", icon: FiActivity },
  { id: "account", label: "Account", icon: FiSliders },
];

export default function UserProfile() {
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const handleUserUpdate = (patch) => {
    if (updateUser) updateUser(patch);
  };

  return (
    <>
      <Navbar />

      <div className="profile-page">
        <div className="profile-page__inner">
          <div className="profile-header">
            <div className="profile-avatar">
              {(user?.name || user?.email || "?")[0].toUpperCase()}
            </div>
            <div>
              <h1 className="profile-header__name">
                {user?.name || "Your Account"}
              </h1>
              <p className="profile-header__email">{user?.email}</p>
            </div>
          </div>

          <div className="profile-tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`profile-tab ${activeTab === tab.id ? "profile-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="profile-content">
            {activeTab === "profile" && (
              <>
                <ProfileInfo user={user} />
                <ChangeName user={user} onUpdate={handleUserUpdate} />
              </>
            )}
            {activeTab === "security" && (
              <>
                <ChangeEmail
                  user={user}
                  onUpdate={handleUserUpdate}
                  logout={logout}
                />
                <ChangePassword logout={logout} />
              </>
            )}
            {activeTab === "statuspage" && (
              <StatusPageSettings user={user} onUpdate={handleUserUpdate} />
            )}
            {activeTab === "account" && (
              <>
                <DeactivateAccount logout={logout} />
                <DeleteAccount logout={logout} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
