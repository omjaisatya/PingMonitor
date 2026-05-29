import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../hook/useAuth";
import "../styles/LoginRegis.css";
import AppName from "../AppName";
import logo from "../assets/logo.png";
import { toast } from "react-toastify";

const parseLockoutMinutes = (message = "") => {
  const match = message.match(/(\d+)\s*minute/i);
  return match ? parseInt(match[1], 10) : null;
};

const getApiMessage = (err, fallback) => {
  const validationErrors = err.response?.data?.error;
  if (Array.isArray(validationErrors) && validationErrors.length) {
    return validationErrors.map((item) => item.message).join(", ");
  }

  return err.response?.data?.message || fallback;
};

export default function Login() {
  const { login: establishSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [lockoutMinutes, setLockoutMinutes] = useState(null);
  const [attemptsWarning, setAttemptsWarning] = useState(null);

  const sessionCompromised =
    searchParams.get("reason") === "session_compromised";
  const resetToken = searchParams.get("resetToken");
  const verifyToken = searchParams.get("verifyToken");
  const isForgotMode = searchParams.get("mode") === "forgot";
  const formMode = useMemo(() => {
    if (resetToken) return "reset";
    if (isForgotMode) return "forgot";
    return "login";
  }, [isForgotMode, resetToken]);

  useEffect(() => {
    if (!verifyToken) return;

    const verifyEmail = async () => {
      try {
        const { data } = await api.post("/auth/verify-email", {
          token: verifyToken,
        });
        toast.success(data.message || "Email verified successfully");
        navigate("/login", { replace: true });
      } catch (err) {
        toast.error(getApiMessage(err, "Failed to verify email"));
        navigate("/login", { replace: true });
      }
    };

    verifyEmail();
  }, [navigate, verifyToken]);

  const handleInputUpdate = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (attemptsWarning) setAttemptsWarning(null);
  };

  const executeLogin = async (e) => {
    e.preventDefault();

    const { email, password } = credentials;

    if (!email || !password) {
      toast.error("Both Email and Password are required", {
        position: "top-right",
        autoClose: true,
      });
      return;
    }

    setIsLoggingIn(true);
    setAttemptsWarning(null);

    try {
      const { data } = await api.post("/auth/login", { email, password });

      if (data.user && data.token) {
        toast.success(data.message || "Login successful");
        establishSession(data.user, data.token, data.csrfToken);
        navigate("/dashboard");
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = getApiMessage(err, "Login failed, try again");

      if (status === 423) {
        // account locked
        const minutes = parseLockoutMinutes(msg);
        setLockoutMinutes(minutes);
        toast.error(msg, { autoClose: false });
        return;
      }

      const attemptsRemaining = err.response?.data?.attemptsRemaining;
      if (attemptsRemaining !== undefined && attemptsRemaining > 0) {
        setAttemptsWarning(
          `${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining before lockout`,
        );
      }

      toast.error(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const requestPasswordReset = async (e) => {
    e.preventDefault();

    if (!resetEmail) return toast.error("Email is required");

    setIsRequestingReset(true);
    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: resetEmail,
      });
      toast.success(data.message || "Password reset email sent");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(getApiMessage(err, "Failed to request password reset"));
    } finally {
      setIsRequestingReset(false);
    }
  };

  const executePasswordReset = async (e) => {
    e.preventDefault();

    if (!newPassword) return toast.error("New password is required");
    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return toast.error(
        "Password must contain uppercase, lowercase, and numbers",
      );
    }

    setIsResettingPassword(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        token: resetToken,
        password: newPassword,
      });
      toast.success(data.message || "Password reset successfully");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(getApiMessage(err, "Failed to reset password"));
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <img src={logo} alt="app-logo" className="brand-logo" />
        <span className="auth-brand-name">{AppName}</span>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            {formMode === "reset"
              ? "Reset password"
              : formMode === "forgot"
                ? "Recover password"
                : "Welcome back"}
          </h1>
          <p className="auth-subtitle">
            {formMode === "reset"
              ? "choose a new secure password"
              : formMode === "forgot"
                ? "get a reset link in your inbox"
                : "sign in to your monitoring dashboard"}
          </p>
        </div>

        {sessionCompromised && (
          <div className="auth-alert auth-alert--danger">
            <span className="auth-alert__icon">⚠</span>
            <span>
              Your session was terminated for security reasons. Please sign in
              again.
            </span>
          </div>
        )}

        {lockoutMinutes && (
          <div className="auth-alert auth-alert--warning">
            <span className="auth-alert__icon">🔒</span>
            <span>
              Account temporarily locked. Try again in{" "}
              <strong>{lockoutMinutes} minutes</strong>.
            </span>
          </div>
        )}

        {formMode === "forgot" && (
          <form className="auth-form" onSubmit={requestPasswordReset}>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-email">
                Email
              </label>
              <input
                className="form-input"
                id="reset-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isRequestingReset}
            >
              {isRequestingReset ? (
                <>
                  <span className="spinner" /> Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        )}

        {formMode === "reset" && (
          <form className="auth-form" onSubmit={executePasswordReset}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">
                New password
              </label>
              <div className="password-field">
                <input
                  className="form-input"
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  name="password"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowNewPassword((value) => !value)}
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isResettingPassword}
            >
              {isResettingPassword ? (
                <>
                  <span className="spinner" /> Updating...
                </>
              ) : (
                "Reset password"
              )}
            </button>
          </form>
        )}

        {formMode === "login" && (
          <form className="auth-form" onSubmit={executeLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                className="form-input"
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={credentials.email}
                onChange={handleInputUpdate}
                autoComplete="email"
                disabled={!!lockoutMinutes}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className="password-field">
                <input
                  className="form-input"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={handleInputUpdate}
                  autoComplete="current-password"
                  disabled={!!lockoutMinutes}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={!!lockoutMinutes}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {attemptsWarning && (
              <p className="auth-attempts-warning">{attemptsWarning}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isLoggingIn || !!lockoutMinutes}
            >
              {isLoggingIn ? (
                <>
                  <span className="spinner" /> Verifying...
                </>
              ) : lockoutMinutes ? (
                `Locked for ${lockoutMinutes}m`
              ) : (
                "Sign In →"
              )}
            </button>
            <Link to="/login?mode=forgot" className="auth-link auth-link-small">
              Forgot password?
            </Link>
          </form>
        )}

        <p className="auth-switch">
          {formMode === "login" ? "Don't have an account? " : "Back to "}{" "}
          <Link
            to={formMode === "login" ? "/register" : "/login"}
            className="auth-link"
          >
            {formMode === "login" ? "Create one" : "Sign in"}
          </Link>
        </p>
      </div>

      <div className="auth-bg-text" aria-hidden>
        {AppName}
      </div>
    </div>
  );
}
