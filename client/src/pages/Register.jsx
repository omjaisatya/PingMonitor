import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import api from "../api/axios";
import "../styles/LoginRegis.css";
import AppName from "../components/AppName";
import logo from "../assets/logo.png";

export default function Register() {
  const { login: establishSession } = useAuth();
  const navigate = useNavigate();

  const [newUserPayload, setNewUserPayload] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [registrationError, setRegistrationError] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleInputUpdate = (e) => {
    setNewUserPayload((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    if (registrationError) setRegistrationError(null);
  };

  const executeRegistration = async (e) => {
    e.preventDefault();

    const { name, email, password } = newUserPayload;

    if (!name || !email || !password) {
      setRegistrationError("All fields are required.");
      return;
    }

    // todo: implement a stronger password policy or add a strength meter (e.g., zxcvbn) post-MVP
    if (password.length < 6) {
      setRegistrationError("Password must be at least 6 characters.");
      return;
    }

    setIsRegistering(true);

    try {
      const { data: authPayload } = await api.post(
        "/auth/signup",
        newUserPayload,
      );

      if (authPayload.newUser && authPayload.token) {
        establishSession(authPayload.newUser, authPayload.token);
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error(
        "RegisterComponent user signup failed ->",
        err.response?.data,
      );
      setRegistrationError(
        err.response?.data?.message ||
          "Registration failed. Please check your connection and try again.",
      );
    } finally {
      setIsRegistering(false);
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
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">start monitoring your services</p>
        </div>

        <form className="auth-form" onSubmit={executeRegistration}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="form-input"
              type="text"
              name="name"
              placeholder="John Doe"
              value={newUserPayload.name}
              onChange={handleInputUpdate}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={newUserPayload.email}
              onChange={handleInputUpdate}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              name="password"
              placeholder="min. 6 characters"
              value={newUserPayload.password}
              onChange={handleInputUpdate}
              autoComplete="new-password"
            />
          </div>

          {registrationError && (
            <div className="alert alert-error">{registrationError}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isRegistering}
          >
            {isRegistering ? (
              <>
                <span className="spinner" /> Creating account...
              </>
            ) : (
              "Create Account →"
            )}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>

      <div className="auth-bg-text" aria-hidden>
        {AppName}
      </div>
    </div>
  );
}
