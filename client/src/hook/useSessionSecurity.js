// hook/useSessionSecurity.js
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "./useAuth";

export const useSessionSecurity = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCompromised = async (e) => {
      const reason = e.detail?.reason;

      if (reason === "refresh_token_reuse") {
        toast.error(
          "⚠ Your session was terminated because your login credentials may have been compromised. Please sign in again.",
          { autoClose: false, closeOnClick: false },
        );
      }

      navigate("/login?reason=session_compromised", { replace: true });
    };

    window.addEventListener("auth:session-compromised", handleCompromised);
    return () => {
      window.removeEventListener("auth:session-compromised", handleCompromised);
    };
  }, [logout, navigate]);
};
