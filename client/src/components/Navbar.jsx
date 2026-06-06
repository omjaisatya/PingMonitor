import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hook/useAuth";
import api from "../api/axios";
import "../styles/Navbar.css";
import AppName from "../AppName";
import logo from "../assets/logo.png";
import { FiBell, FiChevronDown, FiMoon, FiSun } from "react-icons/fi";

export default function Navbar() {
  const {
    user: activeUser,
    logout: terminateSession,
    updateTheme,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isProcessingLogout, setIsProcessingLogout] = useState(false);
  const [isMobileNavExpanded, setIsMobileNavExpanded] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isThemeSaving, setIsThemeSaving] = useState(false);

  // Notifications states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  // close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!activeUser) return;
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [activeUser]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // refresh every 20s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markNotifRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllNotifRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

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

  const activeTheme = activeUser?.themePreference || "dark";
  const nextTheme = activeTheme === "dark" ? "light" : "dark";
  const ThemeIcon = activeTheme === "dark" ? FiSun : FiMoon;

  const handleThemeToggle = async () => {
    if (isThemeSaving) return;
    setIsThemeSaving(true);
    try {
      await updateTheme(nextTheme);
    } catch (err) {
      console.error("Failed to update theme preference:", err);
    } finally {
      setIsThemeSaving(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/analytics", label: "Analytics" },
    { to: "/incidents", label: "Incidents" },
  ];

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
            <div className="navbar-links desktop-only">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`navbar-link ${isActive(link.to) ? "navbar-link--active" : ""}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Notification Bell Trigger */}
            <div className="navbar-notif desktop-only" ref={notifMenuRef} style={{ marginRight: "12px", position: "relative" }}>
              <button
                className={`notif-trigger ${unreadCount > 0 ? "has-unread" : ""}`}
                onClick={() => setIsNotifOpen((p) => !p)}
                aria-expanded={isNotifOpen}
                aria-label="Notifications"
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <span className="notif-bell-icon" style={{ display: "flex", alignItems: "center" }}>
                  <FiBell size={18} />
                </span>
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount}</span>
                )}
              </button>

              {isNotifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown__header">
                    <span className="notif-dropdown__title">Notifications</span>
                    {unreadCount > 0 && (
                      <button className="notif-dropdown__clear-btn" onClick={markAllNotifRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notif-dropdown__divider" />
                  <div className="notif-dropdown__list">
                    {notifications.length === 0 ? (
                      <div className="notif-dropdown__empty">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          className={`notif-dropdown__item ${notif.isRead ? "" : "notif-unread"}`}
                          onClick={() => !notif.isRead && markNotifRead(notif._id)}
                        >
                          <div className="notif-item__header">
                            <span className={`notif-item__badge notif-badge-${notif.status}`}>
                              {notif.status.toUpperCase()}
                            </span>
                            <span className="notif-item__time">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="notif-item__msg">{notif.message}</div>
                          {notif.monitorId && (
                            <div className="notif-item__monitor">
                              {notif.monitorId.name} ({notif.monitorId.url})
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                <FiChevronDown
                  className={`user-trigger__chevron ${isUserMenuOpen ? "open" : ""}`}
                  size={14}
                  style={{ marginLeft: "4px" }}
                />
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
                  <button
                    className="user-dropdown__item"
                    onClick={handleThemeToggle}
                    disabled={isThemeSaving}
                  >
                    <ThemeIcon size={14} />
                    {isThemeSaving
                      ? "Saving theme..."
                      : `Switch to ${nextTheme} mode`}
                  </button>
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

          {/* Mobile notifications list */}
          <div className="mobile-menu__notif">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "0 12px" }}>
              <span className="form-label" style={{ margin: 0, fontSize: "10px" }}>Recent Alerts ({unreadCount} unread)</span>
              {unreadCount > 0 && (
                <button className="notif-dropdown__clear-btn" onClick={markAllNotifRead} style={{ fontSize: "10px", background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: "bold" }}>
                  Mark all read
                </button>
              )}
            </div>
            <div className="mobile-notif-list" style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", padding: "0 12px" }}>
              {notifications.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>No alerts</div>
              ) : (
                notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif._id}
                    className={`mobile-notif-item ${notif.isRead ? "" : "mobile-notif-unread"}`}
                    onClick={() => !notif.isRead && markNotifRead(notif._id)}
                    style={{
                      background: notif.isRead ? "var(--bg-input)" : "rgba(102, 85, 255, 0.05)",
                      border: `1px solid ${notif.isRead ? "var(--border)" : "var(--accent-border)"}`,
                      borderRadius: "8px",
                      padding: "10px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, color: notif.status === "down" ? "var(--red)" : notif.status === "up" ? "var(--green)" : "var(--yellow)" }}>
                        {notif.status.toUpperCase()}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ color: "var(--text-primary)", fontWeight: notif.isRead ? 400 : 600 }}>{notif.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mobile-menu__divider" />

          <div className="mobile-menu__links">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`mobile-menu__link ${isActive(link.to) ? "mobile-menu__link--active" : ""}`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/profile"
              className={`mobile-menu__link ${isActive("/profile") ? "mobile-menu__link--active" : ""}`}
            >
              Account settings
            </Link>
            <button
              className="mobile-menu__link mobile-menu__theme"
              onClick={handleThemeToggle}
              disabled={isThemeSaving}
            >
              <ThemeIcon size={14} />
              {isThemeSaving
                ? "Saving theme..."
                : `Switch to ${nextTheme} mode`}
            </button>
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
