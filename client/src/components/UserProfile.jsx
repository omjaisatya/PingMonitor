import { useState, useMemo, useEffect } from "react";
import { toast } from "../context/ToastContext";
import { useAuth } from "../hook/useAuth";
import apiClient from "../api/axios";
import "../styles/UserProfile.css";
import Navbar from "./Navbar";
import Avatar from "./Avatar";
import {
  FiUser,
  FiShield,
  FiSliders,
  FiSettings,
  FiActivity,
  FiEye,
  FiEyeOff,
  FiCopy,
  FiCheck,
  FiExternalLink,
  FiCamera,
  FiTrash2,
  FiUpload,
  FiMail,
} from "react-icons/fi";

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

const Field = ({ label, hint, id, children }) => (
  <div className="profile-field">
    {label && (
      <label htmlFor={id} className="profile-field__label">
        {label}
      </label>
    )}
    {children}
    {hint && <p className="profile-field__hint">{hint}</p>}
  </div>
);

const PasswordInput = ({ id, value, onChange, placeholder, autoComplete }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input
        id={id}
        className="profile-input profile-input--password"
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
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
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
          <Field
            label={
              <span>
                Type <strong>{requireText}</strong> to confirm
              </span>
            }
            id="modalConfirmInput"
          >
            <input
              id="modalConfirmInput"
              className="profile-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
              autoComplete="off"
            />
          </Field>
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

const AvatarSettings = ({ user, onUpdate }) => {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const validateFile = (file) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max size is 5MB.");
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", selectedFile);

    try {
      const { data } = await apiClient.post("/auth/profile/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Profile picture updated successfully!");
      onUpdate({ avatar: data.avatar });
      handleCancelPreview();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data } = await apiClient.delete("/auth/profile/avatar");
      toast.success("Profile picture removed successfully!");
      onUpdate({ avatar: data.avatar });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove avatar");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SectionCard
      title="Profile Picture"
      subtitle="Update or remove your account's public avatar image"
      icon={<FiCamera />}
    >
      <div className="avatar-settings-container">
        <div className="avatar-settings-preview-side">
          {previewUrl ? (
            <div className="avatar-wrapper" style={{ width: "80px", height: "80px" }}>
              <img src={previewUrl} alt="Preview" className="avatar-img" />
            </div>
          ) : (
            <Avatar user={user} size="xl" />
          )}
          {user?.avatar?.url && !previewUrl && (
            <button
              type="button"
              className="btn btn-danger btn-sm avatar-delete-btn"
              onClick={handleDelete}
              disabled={deleting || uploading}
            >
              <FiTrash2 size={13} />
              <span>{deleting ? "Removing..." : "Remove"}</span>
            </button>
          )}
        </div>

        <div className="avatar-settings-upload-side">
          {!previewUrl ? (
            <div
              className={`upload-zone ${dragActive ? "upload-zone--active" : ""}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("avatar-file-input").click()}
            >
              <input
                id="avatar-file-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <FiUpload className="upload-zone__icon" size={24} />
              <p className="upload-zone__text">
                Drag & drop your picture here, or <strong>browse files</strong>
              </p>
              <span className="upload-zone__subtext">
                Supports JPG, JPEG, PNG, WEBP up to 5MB
              </span>
            </div>
          ) : (
            <div className="preview-actions-container">
              <p className="preview-actions-text">
                Would you like to save this image as your profile picture?
              </p>
              <div className="preview-actions-buttons">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleCancelPreview}
                  disabled={uploading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
};

const ProfileInfo = ({ user }) => (
  <SectionCard
    title="Account Info"
    subtitle="Your current account details"
    icon={<FiUser />}
  >
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
    <SectionCard
      title="Display Name"
      subtitle="Update how your name appears"
      icon={<FiSettings />}
    >
      <form onSubmit={handleSubmit} className="form-layout">
        <Field label="Full name" id="profileName">
          <input
            id="profileName"
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
      <form onSubmit={handleSubmit} className="form-layout">
        <Field label="New email address" id="newEmail">
          <input
            id="newEmail"
            className="profile-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="new@example.com"
            autoComplete="email"
          />
        </Field>
        <Field
          label="Current password"
          hint="Required to confirm this change"
          id="emailConfirmPassword"
        >
          <PasswordInput
            id="emailConfirmPassword"
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
      <form onSubmit={handleSubmit} className="form-layout">
        <Field label="Current password" id="currentPassword">
          <PasswordInput
            id="currentPassword"
            value={form.current}
            onChange={(e) =>
              setForm((p) => ({ ...p, current: e.target.value }))
            }
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </Field>
        <Field label="New password" id="newPassword">
          <PasswordInput
            id="newPassword"
            value={form.next}
            onChange={(e) => setForm((p) => ({ ...p, next: e.target.value }))}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
        </Field>
        <PasswordStrengthBar password={form.next} />
        <Field label="Confirm new password" id="confirmPassword">
          <PasswordInput
            id="confirmPassword"
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

const ExportUserData = () => {
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingAlerts, setDownloadingAlerts] = useState(false);
  const [downloadingEmails, setDownloadingEmails] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleExportJson = async () => {
    setDownloadingJson(true);
    try {
      const response = await apiClient.get("/auth/profile/export", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `pingmonitor_account_backup_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Account data backup downloaded successfully!");
    } catch (err) {
      toast.error("Failed to export account data");
      console.error(err);
    } finally {
      setDownloadingJson(false);
    }
  };

  const handleExportAlerts = async () => {
    setDownloadingAlerts(true);
    try {
      const response = await apiClient.get("/analytics/export/alerts", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "alerts_history_full_report.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Alert history CSV downloaded!");
    } catch (err) {
      toast.error("Failed to export alert history CSV");
      console.error(err);
    } finally {
      setDownloadingAlerts(false);
    }
  };

  const handleExportEmails = async () => {
    setDownloadingEmails(true);
    try {
      const response = await apiClient.get("/analytics/export/emails", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "email_tracking_full_report.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Email tracking CSV downloaded!");
    } catch (err) {
      toast.error("Failed to export email tracking CSV");
      console.error(err);
    } finally {
      setDownloadingEmails(false);
    }
  };

  const handleExportPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await apiClient.get("/analytics/export/pdf", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "global_system_report.pdf");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Global PDF report downloaded successfully!");
    } catch (err) {
      toast.error("Failed to export PDF report");
      console.error(err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <SectionCard
      title="Export Personal Data"
      subtitle="Download a copy of your monitors, alert history, and email tracking logs"
      icon={<FiUpload />}
    >
      <div className="danger-zone-wrapper">
        <p className="danger-description">
          Export your complete account configuration, metrics, and history. The backup JSON file contains all your monitors, incident history, and system settings.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
          <button
            className="btn btn-primary"
            onClick={handleExportJson}
            disabled={downloadingJson}
          >
            {downloadingJson ? "Exporting JSON..." : "Download Account Backup (JSON)"}
          </button>
          <button
            className="btn btn-outline"
            onClick={handleExportPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? "Exporting PDF..." : "Download System Report (PDF)"}
          </button>
          <button
            className="btn btn-outline"
            onClick={handleExportAlerts}
            disabled={downloadingAlerts}
          >
            {downloadingAlerts ? "Exporting CSV..." : "Download Alerts Log (CSV)"}
          </button>
          <button
            className="btn btn-outline"
            onClick={handleExportEmails}
            disabled={downloadingEmails}
          >
            {downloadingEmails ? "Exporting CSV..." : "Download Emails Log (CSV)"}
          </button>
        </div>
      </div>
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
        <div className="danger-zone-wrapper">
          <p className="danger-description">
            Your account and data will be preserved. You can reactivate at any
            time by signing back in.
          </p>
          <button
            className="btn btn-warning"
            onClick={() => setModalOpen(true)}
          >
            Deactivate account
          </button>
        </div>
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
        <div className="danger-zone-wrapper">
          <p className="danger-description">
            This is irreversible. All your monitors, history, and account data
            will be permanently erased with no way to recover them.
          </p>
          <button className="btn btn-danger" onClick={() => setModalOpen(true)}>
            Delete my account
          </button>
        </div>
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

const CopyButton = ({ text, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      className={`btn ${copied ? "btn-success-pills" : "btn-ghost"}`}
      onClick={handleCopy}
    >
      {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
};

const StatusPageSettings = ({ user, onUpdate }) => {
  const [enabled, setEnabled] = useState(user?.statusPageEnabled ?? true);
  const [title, setTitle] = useState(user?.statusPageTitle || "System Status");
  const [desc, setDesc] = useState(
    user?.statusPageDescription || "Live status of our services.",
  );
  const [slug, setSlug] = useState(user?.statusPageSlug || "");
  const [saving, setSaving] = useState(false);

  const [monitors, setMonitors] = useState([]);
  const [loadingMons, setLoadingMons] = useState(false);

  useEffect(() => {
    const fetchMonitors = async () => {
      setLoadingMons(true);
      try {
        const { data } = await apiClient.get("/monitors");
        setMonitors(
          data.allMonitors ||
            data.monitors ||
            (Array.isArray(data) ? data : []),
        );
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

  return (
    <div className="status-settings-wrapper">
      <SectionCard
        title="Status Page Configuration"
        subtitle="Configure your public status dashboard"
        icon={<FiActivity />}
      >
        <form onSubmit={handleSave} className="form-layout">
          <div className="toggle-control">
            <label className="switch">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className={`slider round ${enabled ? "active" : ""}`}>
                <span className={`slider-thumb ${enabled ? "active" : ""}`} />
              </span>
            </label>
            <span className="toggle-label">
              {enabled
                ? "Public Status Page Enabled"
                : "Public Status Page Disabled"}
            </span>
          </div>

          <Field
            label="Status Page Title"
            hint="Display title on the public page"
            id="statusTitle"
          >
            <input
              id="statusTitle"
              className="profile-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Acme Corp System Status"
              required
            />
          </Field>

          <Field
            label="Status Page Description"
            hint="Brief explanation of your status updates"
            id="statusDesc"
          >
            <textarea
              id="statusDesc"
              className="profile-input profile-input--textarea"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Live status of Acme Corp APIs and websites."
              rows={3}
            />
          </Field>

          <Field
            label="Custom Page Slug"
            hint="Set a custom path segment. Leave empty to use your default account ID."
            id="statusSlug"
          >
            <div className="slug-input-container">
              <span className="slug-prefix">/status/</span>
              <input
                id="statusSlug"
                className="profile-input profile-input--slug"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""),
                  )
                }
                placeholder="e.g. acme-status"
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
          <SectionCard
            title="Sharing & Embed Widgets"
            subtitle="Use these links and elements to attach status reports"
            icon={<FiSettings />}
          >
            <div className="form-layout">
              <Field
                label="Public Status Link"
                hint="Direct link to your unauthenticated status page"
                id="publicStatusLink"
              >
                <div className="action-input-group">
                  <input
                    id="publicStatusLink"
                    className="profile-input profile-input--readonly"
                    readOnly
                    value={publicUrl}
                    onClick={(e) => e.target.select()}
                  />
                  <CopyButton text={publicUrl} label="Link" />
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-icon-only"
                  >
                    <FiExternalLink size={14} />
                    <span>Visit</span>
                  </a>
                </div>
              </Field>

              <Field
                label="Iframe Embed Snippet"
                hint="Paste this HTML into your website's body"
                id="iframeEmbedSnippet"
              >
                <div className="action-input-group">
                  <input
                    id="iframeEmbedSnippet"
                    className="profile-input profile-input--readonly"
                    readOnly
                    value={iframeCode}
                    onClick={(e) => e.target.select()}
                  />
                  <CopyButton text={iframeCode} label="Iframe Code" />
                </div>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Status Badge Previews"
            subtitle="Live SVG badges to embed in README files or sites"
            icon={<FiActivity />}
          >
            <div className="badge-preview-container">
              <div className="badge-preview-row">
                <div className="badge-meta">
                  <h4>Overall Account Status</h4>
                </div>
                <div className="badge-action-card">
                  <div className="badge-visual-container">
                    <img
                      src={`${userBadgeUrl}?t=${Date.now()}`}
                      alt="Overall status badge"
                      key={user?.statusPageSlug || user?._id}
                    />
                  </div>
                  <div className="badge-buttons">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `![System Status](${userBadgeUrl})`,
                        ) & toast.success("Markdown Badge copied!")
                      }
                    >
                      Markdown
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `<img src="${userBadgeUrl}" alt="System Status" />`,
                        ) & toast.success("HTML Badge copied!")
                      }
                    >
                      HTML
                    </button>
                  </div>
                </div>
              </div>

              <div className="individual-badges-section">
                <h4>Individual Monitor Badges</h4>

                {loadingMons ? (
                  <div className="loading-state">Loading monitors list...</div>
                ) : monitors.length === 0 ? (
                  <div className="empty-state">
                    No monitors configured to create badges.
                  </div>
                ) : (
                  <div className="monitors-badge-list">
                    {monitors.map((mon) => {
                      const monBadgeUrl = `${serverBase}/public/badge/${mon._id}`;
                      return (
                        <div key={mon._id} className="monitor-badge-item">
                          <div className="monitor-details">
                            <span className="monitor-name">{mon.name}</span>
                            <span className="monitor-url">{mon.url}</span>
                          </div>
                          <div className="monitor-badge-actions">
                            <div className="badge-visual-wrapper">
                              <img
                                src={monBadgeUrl}
                                alt={`${mon.name} status badge`}
                              />
                            </div>
                            <div className="badge-buttons-group">
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    `![${mon.name} Status](${monBadgeUrl})`,
                                  ) & toast.success("Markdown copied!")
                                }
                              >
                                MD
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    `<img src="${monBadgeUrl}" alt="${mon.name} Status" />`,
                                  ) & toast.success("HTML copied!")
                                }
                              >
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

const EmailReportSettings = ({ user, onUpdate }) => {
  const defaultTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  
  const [enabled, setEnabled] = useState(user?.emailReportConfig?.enabled ?? false);
  const [frequency, setFrequency] = useState(user?.emailReportConfig?.frequency || "weekly");
  const [deliveryTime, setDeliveryTime] = useState(user?.emailReportConfig?.deliveryTime || "09:00");
  const [timezone, setTimezone] = useState(user?.emailReportConfig?.timezone || defaultTimezone);
  const [sections, setSections] = useState(user?.emailReportConfig?.sections || {
    uptime: true,
    incidents: true,
    responseTime: true,
    ssl: true,
    heartbeats: true,
  });
  
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await apiClient.patch("/auth/profile/email-reports", {
        enabled,
        frequency,
        deliveryTime,
        timezone,
        sections,
      });
      toast.success("Email report settings updated!");
      onUpdate({ emailReportConfig: data.emailReportConfig });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestReport = async () => {
    setTesting(true);
    try {
      await apiClient.post("/auth/profile/email-reports/test");
      toast.success("Test report email has been sent!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send test report");
    } finally {
      setTesting(false);
    }
  };

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Calcutta",
    "Australia/Sydney",
  ];

  if (!timezones.includes(defaultTimezone) && defaultTimezone !== "UTC") {
    timezones.push(defaultTimezone);
  }

  return (
    <SectionCard
      title="Scheduled Email Reports"
      subtitle="Receive periodic summaries of your monitors and incidents directly in your inbox"
      icon={<FiMail />}
    >
      <form onSubmit={handleSave} className="form-layout">
        <div className="toggle-control">
          <label className="switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span className={`slider round ${enabled ? "active" : ""}`}>
              <span className={`slider-thumb ${enabled ? "active" : ""}`} />
            </span>
          </label>
          <span className="toggle-label">
            {enabled ? "Scheduled Reports Enabled" : "Scheduled Reports Disabled"}
          </span>
        </div>

        {enabled && (
          <>
            <Field label="Frequency" id="reportFreq">
              <select
                id="reportFreq"
                className="profile-input"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>

            <div className="time-tz-row" style={{ display: "flex", gap: "16px" }}>
              <div style={{ flex: 1 }}>
                <Field label="Delivery Time" id="deliveryTime">
                  <input
                    type="time"
                    id="deliveryTime"
                    className="profile-input"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Timezone" id="reportTz">
                  <select
                    id="reportTz"
                    className="profile-input"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className="report-sections">
              <p className="profile-field__label" style={{ marginBottom: "8px", display: "block" }}>Include Sections</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {Object.entries({
                  uptime: "Uptime Summary",
                  incidents: "Recent Incidents",
                  responseTime: "Average Response Time",
                  ssl: "SSL Status",
                  heartbeats: "Heartbeats Status"
                }).map(([key, label]) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#e8e8f0", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      checked={sections[key]}
                      onChange={(e) => setSections({ ...sections, [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="action-row" style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
          
          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={handleTestReport}
            disabled={testing}
          >
            {testing ? "Sending..." : "Send Test Report"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
};

const TABS = [
  { id: "profile", label: "Profile", icon: FiUser },
  { id: "security", label: "Security", icon: FiShield },
  { id: "statuspage", label: "Status Page", icon: FiActivity },
  { id: "reports", label: "Reports", icon: FiMail },
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
            <Avatar user={user} size="xl" className="profile-header-avatar" />
            <div>
              <h1 className="profile-header__name">
                {user?.name || "Your Account"}
              </h1>
              <p className="profile-header__email">{user?.email}</p>
            </div>
          </div>

          <div className="profile-tabs" role="tablist">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`profile-tab ${activeTab === tab.id ? "profile-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="profile-content">
            {activeTab === "profile" && (
              <>
                <AvatarSettings user={user} onUpdate={handleUserUpdate} />
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
            {activeTab === "reports" && (
              <EmailReportSettings user={user} onUpdate={handleUserUpdate} />
            )}
            {activeTab === "account" && (
              <>
                <ExportUserData />
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
