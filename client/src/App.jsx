import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MonitorDetail from "./pages/MonitorDetail";
import { useAuth } from "./context/useAuth";
import { AuthProvider } from "./context/AuthProvider";
import AppName from "./AppName";
import { ToastContainer } from "react-toastify";

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

// private
const RequireAuth = ({ children }) => {
  const { user: activeUser, loading: isSessionResolving } = useAuth();

  // todo - add loading in return swap null
  if (isSessionResolving) return <AuthLoading />;

  return activeUser ? children : <Navigate to="/login" replace />;
};

// public
const RequireGuest = ({ children }) => {
  const { user: activeUser, loading: isSessionResolving } = useAuth();

  if (isSessionResolving) return <AuthLoading />;

  return !activeUser ? children : <Navigate to="/dashboard" replace />;
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
      path="/monitors/:id"
      element={
        <RequireAuth>
          <MonitorDetail />
        </RequireAuth>
      }
    />

    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ApplicationRouter />
        <ToastContainer theme="dark" stacked />
      </BrowserRouter>
    </AuthProvider>
  );
}
