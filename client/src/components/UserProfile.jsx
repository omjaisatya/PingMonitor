// components/UserProfile.jsx
import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../hook/useAuth";
import apiClient from "../api/axios";
import "../styles/UserProfile.css";
import Navbar from "./Navbar";

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
  <SectionCard title="Account Info" subtitle="Your current account details">
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
    <SectionCard title="Display Name" subtitle="Update how your name appears">
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
      setTimeout(() => logout(), 1500);
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
      setTimeout(() => logout(), 1500);
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
      // icon="🔑"
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
        // icon="⏸️"
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

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "account", label: "Account" },
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
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`profile-tab ${activeTab === tab.id ? "profile-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {/* implement icons in future */}
                {/* <span className="profile-tab__icon">{tab.icon}</span> */}
                {tab.label}
              </button>
            ))}
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
