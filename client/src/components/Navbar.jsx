import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "../styles/Navbar.css";
import AppName from "../AppName";
import logo from "../assets/logo.png";

export default function Navbar() {
  const { user: activeUser, logout: terminateSession } = useAuth();
  const navigate = useNavigate();

  const [isProcessingLogout, setIsProcessingLogout] = useState(false);
  const [isMobileNavExpanded, setIsMobileNavExpanded] = useState(false);

  const executeLogout = async () => {
    setIsProcessingLogout(true);

    try {
      await terminateSession();
      navigate("/login");
    } catch (err) {
      console.error("Navbar failed to cleanly terminate session ->", err);
      navigate("/login");
    } finally {
      setIsProcessingLogout(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="navbar-brand">
          <img src={logo} alt="app-logo" className="brand-logo" />
          <span className="brand-text">{AppName}</span>
        </Link>

        {activeUser && (
          <>
            <div className="navbar-right desktop-only">
              <span className="navbar-user">
                <span className="user-dot" />
                {activeUser.email}
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={executeLogout}
                disabled={isProcessingLogout}
              >
                {isProcessingLogout ? <span className="spinner" /> : "  Logout"}
              </button>
            </div>

            <button
              className="hamburger mobile-only"
              onClick={() => setIsMobileNavExpanded((prev) => !prev)}
              aria-label="Toggle mobile navigation"
            >
              <span
                className={`ham-line ${isMobileNavExpanded ? "open" : ""}`}
              />
              <span
                className={`ham-line ${isMobileNavExpanded ? "open" : ""}`}
              />
              <span
                className={`ham-line ${isMobileNavExpanded ? "open" : ""}`}
              />
            </button>
          </>
        )}
      </div>

      {/* TODO: extract this mobile drop-down into a separate component if we add more navigation links later */}
      {isMobileNavExpanded && activeUser && (
        <div className="mobile-menu">
          <span className="navbar-user">
            <span className="user-dot" />
            {activeUser.email}
          </span>
          <button
            className="btn btn-outline btn-sm btn-full"
            onClick={executeLogout}
            disabled={isProcessingLogout}
          >
            {isProcessingLogout ? <span className="spinner" /> : "  Logout"}
          </button>
        </div>
      )}
    </nav>
  );
}
