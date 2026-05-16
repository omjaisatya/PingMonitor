import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hook/useAuth";
import "../styles/Navbar.css";
import AppName from "../AppName";
import logo from "../assets/logo.png";

export default function Navbar() {
  const { user: activeUser, logout: terminateSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isProcessingLogout, setIsProcessingLogout] = useState(false);
  const [isMobileNavExpanded, setIsMobileNavExpanded] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userMenuRef = useRef(null);

  // close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // close mobile menu on route change
  useEffect(() => {
    setIsMobileNavExpanded(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  const executeLogout = async () => {
    setIsProcessingLogout(true);
    setIsUserMenuOpen(false);
    setIsMobileNavExpanded(false);
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

  const isActive = (path) => location.pathname === path;

  // const navLinks = [{ to: "/dashboard", label: "Dashboard" }];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/dashboard" className="navbar-brand">
          <img src={logo} alt="app-logo" className="brand-logo" />
          <span className="brand-text">{AppName}</span>
        </Link>

        {activeUser && (
          <>
            {/* Desktop nav links */}
            {/* comment for temporary */}
            {/* <div className="navbar-links desktop-only">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`navbar-link ${isActive(link.to) ? "navbar-link--active" : ""}`}
                >
                  {link.label}
                </Link>
              ))}
            </div> */}

            {/* Desktop right — user dropdown */}
            <div className="navbar-right desktop-only" ref={userMenuRef}>
              <button
                className="user-trigger"
                onClick={() => setIsUserMenuOpen((p) => !p)}
                aria-expanded={isUserMenuOpen}
                aria-label="User menu"
              >
                <span className="user-trigger__avatar">
                  {(activeUser.name ||
                    activeUser.email ||
                    "?")[0].toUpperCase()}
                </span>
                <span className="user-trigger__email">{activeUser.email}</span>
                <span
                  className={`user-trigger__chevron ${isUserMenuOpen ? "open" : ""}`}
                >
                  ▾
                </span>
              </button>

              {isUserMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown__info">
                    <span className="user-dropdown__name">
                      {activeUser.name || "—"}
                    </span>
                    <span className="user-dropdown__email">
                      {activeUser.email}
                    </span>
                  </div>
                  <div className="user-dropdown__divider" />
                  <Link
                    to="/profile"
                    className="user-dropdown__item"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    Account settings
                  </Link>
                  <div className="user-dropdown__divider" />
                  <button
                    className="user-dropdown__item user-dropdown__item--danger"
                    onClick={executeLogout}
                    disabled={isProcessingLogout}
                  >
                    {isProcessingLogout ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger — mobile only */}
            <button
              className={`hamburger mobile-only ${isMobileNavExpanded ? "hamburger--open" : ""}`}
              onClick={() => setIsMobileNavExpanded((prev) => !prev)}
              aria-label="Toggle mobile navigation"
              aria-expanded={isMobileNavExpanded}
            >
              <span className="ham-line" />
              <span className="ham-line" />
              <span className="ham-line" />
            </button>
          </>
        )}
      </div>

      {/* Mobile menu */}
      {isMobileNavExpanded && activeUser && (
        <div className="mobile-menu">
          <div className="mobile-menu__user">
            <span className="mobile-menu__avatar">
              {(activeUser.name || activeUser.email || "?")[0].toUpperCase()}
            </span>
            <div>
              <p className="mobile-menu__name">{activeUser.name || "—"}</p>
              <p className="mobile-menu__email">{activeUser.email}</p>
            </div>
          </div>

          <div className="mobile-menu__divider" />

          <div className="mobile-menu__links">
            {/* {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`mobile-menu__link ${isActive(link.to) ? "mobile-menu__link--active" : ""}`}
              >
                {link.label}
              </Link>
            ))} */}
            <Link
              to="/profile"
              className={`mobile-menu__link ${isActive("/profile") ? "mobile-menu__link--active" : ""}`}
            >
              Account settings
            </Link>
          </div>

          <div className="mobile-menu__divider" />

          <button
            className="mobile-menu__logout"
            onClick={executeLogout}
            disabled={isProcessingLogout}
          >
            {isProcessingLogout ? (
              <>
                <span className="spinner spinner-sm" /> Signing out...
              </>
            ) : (
              "Sign out"
            )}
          </button>
        </div>
      )}
    </nav>
  );
}
