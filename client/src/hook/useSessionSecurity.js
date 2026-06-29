import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../context/ToastContext";
import { useAuth } from "./useAuth";

export const useSessionSecurity = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCompromised = async (e) => {
      const isPublicRoute = (pathname) => {
        return (
          pathname.startsWith("/status/") ||
          pathname === "/login" ||
          pathname === "/register"
        );
      };

      if (isPublicRoute(window.location.pathname)) {
        return;
      }

      const reason = e.detail?.reason;

      if (reason === "refresh_token_reuse") {
        toast.error(
          "⚠ Your session was terminated because your login credentials may have been compromised. Please sign in again.",
          { autoClose: false, closeOnClick: false },
        );
        navigate("/login?reason=session_compromised", { replace: true });
      } else if (reason === "session_expired") {
        toast.warning("Your session has expired. Please log in again.");
        navigate("/login", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    };

    window.addEventListener("auth:session-compromised", handleCompromised);
    return () => {
      window.removeEventListener("auth:session-compromised", handleCompromised);
    };
  }, [logout, navigate]);
};
