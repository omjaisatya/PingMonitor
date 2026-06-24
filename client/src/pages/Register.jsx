import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hook/useAuth";
import api from "../api/axios";
import "../styles/LoginRegis.css";
import AppName from "../AppName";
import logo from "../assets/logo.png";
import { toast } from "../context/ToastContext";
import AuthShowcase from "../components/AuthShowcase";

const getApiMessage = (err, fallback) => {
  const validationErrors = err.response?.data?.error;
  if (Array.isArray(validationErrors) && validationErrors.length) {
    return validationErrors.map((item) => item.message).join(", ");
  }

  return err.response?.data?.message || fallback;
};

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast.error("Password must contain uppercase, lowercase, and numbers");
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
        establishSession(data.newUser, data.token, data.csrfToken);
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(getApiMessage(err, "Failed to register. please try again"));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Side: Product Showcase */}
      <AuthShowcase />

      {/* Right Side: Authentication Area */}
      <div className="auth-panel">
        <div className="auth-panel-content">
          <div className="auth-brand">
            <img src={logo} alt="app-logo" className="brand-logo" />
            <span className="auth-brand-name">{AppName}</span>
          </div>

          <div className="auth-header">
            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">Start monitoring your services with ease</p>
          </div>



          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Name</label>
              <input
                className="form-input"
                id="name"
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleInputUpdate}
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                className="form-input"
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputUpdate}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  className="form-input"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={handleInputUpdate}
                  autoComplete="new-password"
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-field">
                <input
                  className="form-input"
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleInputUpdate}
                  autoComplete="new-password"
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
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
                "Create Account"
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
      </div>
    </div>
  );
}
