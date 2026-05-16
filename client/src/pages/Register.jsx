import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hook/useAuth";
import api from "../api/axios";
import "../styles/LoginRegis.css";
import AppName from "../AppName";
import logo from "../assets/logo.png";
import { toast } from "react-toastify";

export default function Register() {
  const { login: establishSession } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const handleInputUpdate = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword } = formData;

    if (!name || !email || !password || !confirmPassword) {
      toast.error("All fields are required");
      return false;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email address");
      return false;
    }

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsRegistering(true);

    try {
      const { data } = await api.post("/auth/signup", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (data.newUser && data.token) {
        toast.success(data.message || "Account created");
        establishSession(data.newUser, data.token);
        navigate("/dashboard");
      }
    } catch (err) {
      console.log(err.response);

      const msg =
        err.response?.data?.message ||
        err.response?.data?.error[0]?.message ||
        "Failed to register. please try again";
      toast.error(msg);
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

        <form className="auth-form" onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="form-input"
              type="text"
              name="name"
              placeholder="John Doe"
              value={formData.name}
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
              value={formData.email}
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
              value={formData.password}
              onChange={handleInputUpdate}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              className="form-input"
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
              value={formData.confirmPassword}
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
