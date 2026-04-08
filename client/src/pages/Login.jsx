import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/useAuth";
import "../styles/LoginRegis.css";
import AppName from "../components/AppName";
import logo from "../assets/logo.png";

export default function Login() {
  const { login: establishSession } = useAuth();
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleInputUpdate = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // clear stale auth errors as soon as the user starts typing again
    if (authError) setAuthError(null);
  };

  const executeLogin = async (e) => {
    e.preventDefault();

    if (!credentials.email || !credentials.password) {
      setAuthError("Both email and password are required.");
      return;
    }

    setIsAuthenticating(true);

    try {
      const { data: authPayload } = await api.post("/auth/login", credentials);
      establishSession(authPayload.user, authPayload.token);
      navigate("/dashboard");
    } catch (err) {
      console.error("LoginComponent Auth request rejected ->", err);

      setAuthError(
        err.response?.data?.message ||
          "Login failed. Please check your network.",
      );
    } finally {
      setIsAuthenticating(false);
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

        <form className="auth-form" onSubmit={executeLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              className="form-input"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={credentials.email}
              onChange={handleInputUpdate}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              className="form-input"
              type="password"
              name="password"
              placeholder="••••••••"
              value={credentials.password}
              onChange={handleInputUpdate}
              autoComplete="current-password"
            />
          </div>

          {authError && <div className="alert alert-error">{authError}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <>
                <span className="spinner" /> Verifying...
              </>
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
