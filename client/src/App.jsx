import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./hook/useAuth";
import { AuthProvider } from "./context/AuthProvider";
import AppName from "./AppName";
import { ToastProvider } from "./context/ToastContext";
import { useSessionSecurity } from "./hook/useSessionSecurity";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MonitorDetail = lazy(() => import("./pages/MonitorDetail"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Incidents = lazy(() => import("./pages/Incidents"));
const Heartbeats = lazy(() => import("./pages/Heartbeats"));
const HeartbeatDetail = lazy(() => import("./pages/HeartbeatDetail"));
const SyntheticMonitors = lazy(() => import("./pages/SyntheticMonitors"));
const SyntheticDetail = lazy(() => import("./pages/SyntheticDetail"));
const ApiMonitors = lazy(() => import("./pages/ApiMonitors"));
const ApiDetail = lazy(() => import("./pages/ApiDetail"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const PublicStatusPage = lazy(() => import("./pages/PublicStatusPage"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const UserProfile = lazy(() => import("./components/UserProfile"));

// todo: implement toastify external package for better error handling accross all page and component
// todo: implement user profile page section where user can change their password or email.
// todo: implement forget password if user request
// todo: implement userverify when they register account, to prevent spam.
// todo: add react query (RTK)

const AuthLoading = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "16px",
      background: "var(--bg-primary)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "8px",
      }}
    >
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: "var(--green)",
          boxShadow: "0 0 10px var(--green)",
          display: "inline-block",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "18px",
          color: "var(--text-primary)",
        }}
      >
        {AppName}
      </span>
    </div>
    <span className="spinner spinner-lg" />
    <p
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
        color: "var(--text-muted)",
      }}
    >
      Restoring session...
    </p>
  </div>
);

const PageLoader = () => (
  <div
    style={{
      minHeight: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "16px",
      background: "transparent",
    }}
  >
    <span className="spinner spinner-lg" />
  </div>
);

// private
const RequireAuth = ({ children }) => {
  const { isAuthenticated: activeUser, loading: isSessionResolving } =
    useAuth();

  if (isSessionResolving) return <AuthLoading />;

  return activeUser ? children : <Navigate to="/login" replace />;
};

// public
const RequireGuest = ({ children }) => {
  const { isAuthenticated: activeUser, loading: isSessionResolving } =
    useAuth();

  if (isSessionResolving) return <AuthLoading />;

  return !activeUser ? children : <Navigate to="/dashboard" replace />;
};

const SecurityLayer = () => {
  useSessionSecurity();
  return null;
};

const ApplicationRouter = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />

    <Route
      path="/login"
      element={
        <RequireGuest>
          <Login />
        </RequireGuest>
      }
    />
    <Route
      path="/register"
      element={
        <RequireGuest>
          <Register />
        </RequireGuest>
      }
    />

    <Route
      path="/dashboard"
      element={
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      }
    />
    <Route
      path="/analytics"
      element={
        <RequireAuth>
          <Analytics />
        </RequireAuth>
      }
    />
    <Route
      path="/incidents"
      element={
        <RequireAuth>
          <Incidents />
        </RequireAuth>
      }
    />
    <Route
      path="/monitors/:id"
      element={
        <RequireAuth>
          <MonitorDetail />
        </RequireAuth>
      }
    />

    <Route
      path="/profile"
      element={
        <RequireAuth>
          <UserProfile />
        </RequireAuth>
      }
    />

    <Route
      path="/heartbeats"
      element={
        <RequireAuth>
          <Heartbeats />
        </RequireAuth>
      }
    />

    <Route
      path="/heartbeats/:id"
      element={
        <RequireAuth>
          <HeartbeatDetail />
        </RequireAuth>
      }
    />

    <Route
      path="/synthetic"
      element={
        <RequireAuth>
          <SyntheticMonitors />
        </RequireAuth>
      }
    />

    <Route
      path="/synthetic/:id"
      element={
        <RequireAuth>
          <SyntheticDetail />
        </RequireAuth>
      }
    />

    <Route
      path="/api-monitors"
      element={
        <RequireAuth>
          <ApiMonitors />
        </RequireAuth>
      }
    />

    <Route
      path="/api-monitors/:id"
      element={
        <RequireAuth>
          <ApiDetail />
        </RequireAuth>
      }
    />

    <Route
      path="/maintenance"
      element={
        <RequireAuth>
          <Maintenance />
        </RequireAuth>
      }
    />

    <Route path="/unsubscribe/:subscriberId" element={<UnsubscribePage />} />
    <Route path="/status/:slugOrUserId" element={<PublicStatusPage />} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <SecurityLayer />
            <Suspense fallback={<PageLoader />}>
              <ApplicationRouter />
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
