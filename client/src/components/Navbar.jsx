import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hook/useAuth";
import api from "../api/axios";
import "../styles/Navbar.css";
import Avatar from "./Avatar";
import AppName from "../AppName";
import logo from "../assets/logo.png";
import {
  FiBell,
  FiChevronDown,
  FiMoon,
  FiSun,
  FiLogOut,
  FiUser,
  FiMenu,
  FiX,
} from "react-icons/fi";

export default function Navbar() {
  const { user: activeUser, logout: terminateSession, updateTheme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isProcessingLogout, setIsProcessingLogout] = useState(false);
  const [isMobileNavExpanded, setIsMobileNavExpanded] = useState(false);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isThemeSaving, setIsThemeSaving] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get("/config");
        if (data.isDemoMode) setIsDemoMode(true);
      } catch (err) {
      }
    };
    fetchConfig();
  }, []);

  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  useEffect(() => {
    const handleDismissiveActions = (e) => {
      if (e.type === "mousedown") {
        if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
          setIsUserMenuOpen(false);
        }
        if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
          setIsNotifOpen(false);
        }
      } else if (e.type === "keydown" && e.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsNotifOpen(false);
        setIsMobileNavExpanded(false);
        setIsLeftDrawerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDismissiveActions);
    document.addEventListener("keydown", handleDismissiveActions);
    return () => {
      document.removeEventListener("mousedown", handleDismissiveActions);
      document.removeEventListener("keydown", handleDismissiveActions);
    };
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
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markNotifRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
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

  useEffect(() => {
    setIsMobileNavExpanded(false);
    setIsUserMenuOpen(false);
    setIsNotifOpen(false);
    setIsLeftDrawerOpen(false);
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

  const handleThemeToggle = (e) => {
    e.stopPropagation();
    if (isThemeSaving) return;
    setIsThemeSaving(true);
    updateTheme(nextTheme)
      .catch((err) => console.error("Failed to update theme preference:", err))
      .finally(() => setIsThemeSaving(false));
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/heartbeats", label: "Heartbeats" },
    { to: "/synthetic", label: "Synthetic" },
    { to: "/api-monitors", label: "API Monitors" },
    { to: "/maintenance", label: "Maintenance" },
    { to: "/analytics", label: "Analytics" },
    { to: "/incidents", label: "Incidents" },
  ];

  return (
    <nav className="navbar" aria-label="Main Navigation">
      <div className="navbar-inner">
        {activeUser && (
          <button
            className="left-hamburger"
            onClick={() => setIsLeftDrawerOpen(true)}
            aria-label="Open navigation drawer"
            aria-expanded={isLeftDrawerOpen}
          >
            <FiMenu size={20} />
          </button>
        )}

        {/* Brand */}
        <Link
          to="/dashboard"
          className="navbar-brand"
          aria-label={`${AppName} Home`}
        >
          <img src={logo} alt="" className="brand-logo" />
          <span className="brand-text">{AppName}</span>
          {isDemoMode && (
            <span
              className="demo-badge"
              style={{
                fontSize: "10px",
                fontWeight: "700",
                background: "rgba(102, 85, 255, 0.2)",
                color: "var(--accent)",
                padding: "2px 6px",
                borderRadius: "10px",
                marginLeft: "8px",
              }}
              title="Demo Mode: Data resets automatically"
            >
              DEMO
            </span>
          )}
        </Link>

        {activeUser && (
          <>
            <div
              className="navbar-notif-container desktop-only"
              ref={notifMenuRef}
            >
              <button
                className={`notif-trigger ${unreadCount > 0 ? "has-unread" : ""}`}
                onClick={() => setIsNotifOpen((p) => !p)}
                aria-expanded={isNotifOpen}
                aria-haspopup="true"
                aria-label={`Notifications, ${unreadCount} unread items`}
              >
                <span className="notif-bell-icon">
                  <FiBell size={18} />
                </span>
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount}</span>
                )}
              </button>

              {isNotifOpen && (
                <div className="notif-dropdown" role="menu">
                  <div className="notif-dropdown__header">
                    <span className="notif-dropdown__title">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        className="notif-dropdown__clear-btn"
                        onClick={markAllNotifRead}
                      >
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
                          onClick={() =>
                            !notif.isRead && markNotifRead(notif._id)
                          }
                          role="menuitem"
                          tabIndex={0}
                        >
                          <div className="notif-item__header">
                            <span
                              className={`notif-item__badge notif-badge-${notif.status}`}
                            >
                              {notif.status.toUpperCase()}
                            </span>
                            <span className="notif-item__time">
                              {new Date(notif.timestamp).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>
                          <div className="notif-item__msg">{notif.message}</div>
                          {notif.monitorId && (
                            <div className="notif-item__monitor">
                              {notif.monitorId.name} —{" "}
                              <span className="notif-item__url">
                                {notif.monitorId.url}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Account Menu Dropdown */}
            <div className="navbar-right desktop-only" ref={userMenuRef}>
              <button
                className={`user-trigger ${isUserMenuOpen ? "user-trigger--active" : ""}`}
                onClick={() => setIsUserMenuOpen((p) => !p)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
                aria-label="User contextual profile menu"
              >
                <Avatar user={activeUser} size="sm" />
                <span className="user-trigger__email">{activeUser.email}</span>
                <FiChevronDown
                  className={`user-trigger__chevron ${isUserMenuOpen ? "open" : ""}`}
                  size={14}
                />
              </button>

              {isUserMenuOpen && (
                <div className="user-dropdown" role="menu">
                  <div className="user-dropdown__info">
                    <span className="user-dropdown__name">
                      {activeUser.name || "User Account"}
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
                    role="menuitem"
                  >
                    <ThemeIcon size={14} />
                    <span>
                      {isThemeSaving
                        ? "Saving preference..."
                        : `Appearance: ${activeTheme === "dark" ? "Light" : "Dark"} Mode`}
                    </span>
                  </button>
                  <div className="user-dropdown__divider" />
                  <Link
                    to="/profile"
                    className="user-dropdown__item"
                    onClick={() => setIsUserMenuOpen(false)}
                    role="menuitem"
                  >
                    <FiUser size={14} />
                    <span>Account settings</span>
                  </Link>
                  <div className="user-dropdown__divider" />
                  <button
                    className="user-dropdown__item user-dropdown__item--danger"
                    onClick={executeLogout}
                    disabled={isProcessingLogout}
                    role="menuitem"
                  >
                    <FiLogOut size={14} />
                    <span>
                      {isProcessingLogout ? "Signing out..." : "Sign out"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger Trigger — Mobile Viewports */}
            <button
              className={`hamburger mobile-only ${isMobileNavExpanded ? "hamburger--open" : ""}`}
              onClick={() => setIsMobileNavExpanded((prev) => !prev)}
              aria-label={
                isMobileNavExpanded
                  ? "Collapse responsive navigation panel"
                  : "Expand responsive navigation panel"
              }
              aria-expanded={isMobileNavExpanded}
            >
              <span className="ham-line" />
              <span className="ham-line" />
              <span className="ham-line" />
            </button>
          </>
        )}
      </div>

      {/* Expanded Mobile Navigation Drawer */}
      {isMobileNavExpanded && activeUser && (
        <div className="mobile-menu">
          <div className="mobile-menu__user">
            <Avatar user={activeUser} size="md" />
            <div className="mobile-menu__user-meta">
              <p className="mobile-menu__name">{activeUser.name || "—"}</p>
              <p className="mobile-menu__email">{activeUser.email}</p>
            </div>
          </div>

          <div className="mobile-menu__divider" />

          {/* Integrated Mobile Notification Alerts Wrapper */}
          <div className="mobile-menu__notif">
            <div className="mobile-menu__notif-header">
              <span className="mobile-menu__notif-lbl">
                Recent Alerts ({unreadCount} unread)
              </span>
              {unreadCount > 0 && (
                <button
                  className="mobile-menu__clear-all-btn"
                  onClick={markAllNotifRead}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="mobile-notif-list">
              {notifications.length === 0 ? (
                <div className="mobile-notif-empty">No dynamic alerts</div>
              ) : (
                notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif._id}
                    className={`mobile-notif-item ${notif.isRead ? "" : "mobile-notif-unread"}`}
                    onClick={() => !notif.isRead && markNotifRead(notif._id)}
                  >
                    <div className="mobile-notif-item__meta">
                      <span
                        className={`mobile-notif-status mobile-notif-status--${notif.status}`}
                      >
                        {notif.status.toUpperCase()}
                      </span>
                      <span className="mobile-notif-time">
                        {new Date(notif.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="mobile-notif-message">{notif.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mobile-menu__divider" />

          <div className="mobile-menu__links">
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
              <span>
                {isThemeSaving
                  ? "Updating preference..."
                  : `Appearance: ${activeTheme === "dark" ? "Light" : "Dark"} Mode`}
              </span>
            </button>
          </div>

          <div className="mobile-menu__divider" />

          <button
            className="mobile-menu__logout"
            onClick={executeLogout}
            disabled={isProcessingLogout}
          >
            {isProcessingLogout ? (
              <div className="logout-loading-state">
                <span className="spinner spinner-sm" />
                <span>Signing out...</span>
              </div>
            ) : (
              <>
                <FiLogOut size={14} />
                <span>Sign out from session</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Left Navigation Drawer */}
      {activeUser && (
        <>
          <div
            className={`nav-drawer-overlay ${isLeftDrawerOpen ? "open" : ""}`}
            onClick={() => setIsLeftDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            className={`nav-drawer ${isLeftDrawerOpen ? "open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Main Navigation Drawer"
          >
            <div className="nav-drawer__header">
              <div className="navbar-brand">
                <img src={logo} alt="" className="brand-logo" />
                <span className="brand-text">{AppName}</span>
              </div>
              <button
                className="nav-drawer__close"
                onClick={() => setIsLeftDrawerOpen(false)}
                aria-label="Close drawer"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="nav-drawer__links">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-drawer__link ${isActive(link.to) ? "nav-drawer__link--active" : ""}`}
                  onClick={() => setIsLeftDrawerOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
