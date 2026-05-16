import { useState } from "react";
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

export default function Login() {
  const { login: establishSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [lockoutMinutes, setLockoutMinutes] = useState(null);
  const [attemptsWarning, setAttemptsWarning] = useState(null);

  const sessionCompromised =
    searchParams.get("reason") === "session_compromised";

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
        establishSession(data.user, data.token);
        navigate("/dashboard");
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || "Login failed, try again";

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

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <img src={logo} alt="app-logo" className="brand-logo" />
        <span className="auth-brand-name">{AppName}</span>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">sign in to your monitoring dashboard</p>
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
            <input
              className="form-input"
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={credentials.password}
              onChange={handleInputUpdate}
              autoComplete="current-password"
              disabled={!!lockoutMinutes}
            />
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
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register" className="auth-link">
            Create one
          </Link>
        </p>
      </div>

      <div className="auth-bg-text" aria-hidden>
        {AppName}
      </div>
    </div>
  );
}
