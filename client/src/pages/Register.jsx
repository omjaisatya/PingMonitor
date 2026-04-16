import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import api from "../api/axios";
import "../styles/LoginRegis.css";
import AppName from "../AppName";
import logo from "../assets/logo.png";
import { toast } from "react-toastify";

export default function Register() {
  const { login: establishSession } = useAuth();
  const navigate = useNavigate();

  const [newUserPayload, setNewUserPayload] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const handleInputUpdate = (e) => {
    setNewUserPayload((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const executeRegistration = async (e) => {
    e.preventDefault();

    const { name, email, password } = newUserPayload;

    if (!name || !email || !password) {
      toast.error("All fields are required");
      return;
    }

    // todo: implement a stronger password policy or add a strength meter (e.g., zxcvbn) post-MVP
    if (password.length < 6) {
      toast.error("Password must be atleast 6 characters.");
      return;
    }

    setIsRegistering(true);

    try {
      const { data: authPayload } = await api.post(
        "/auth/signup",
        newUserPayload,
      );
      console.log("register data", authPayload);

      if (authPayload.newUser && authPayload.token) {
        toast.success(authPayload.message);
        establishSession(authPayload.newUser, authPayload.token);
      } else {
        navigate("/login");
        toast.error(authPayload.message);
      }
    } catch (err) {
      toast.error(err.message, {
        position: "top-right",
        autoClose: true,
      });
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
