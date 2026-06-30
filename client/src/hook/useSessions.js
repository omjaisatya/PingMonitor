import { useState, useCallback, useEffect } from "react";
import apiClient from "../api/axios";
import { toast } from "../context/ToastContext";

export const useSessions = () => {
  const [sessionsData, setSessionsData] = useState({
    currentSession: null,
    otherActiveSessions: [],
    sessionHistory: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/profile/sessions");
      setSessionsData({
        currentSession: data.currentSession,
        otherActiveSessions: data.otherActiveSessions || [],
        sessionHistory: data.sessionHistory || [],
      });
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      const errMsg = err.response?.data?.message || "Failed to load sessions";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeSession = useCallback(async (sessionId) => {
    setLoading(true);
    try {
      const { data } = await apiClient.delete(`/profile/sessions/${sessionId}`);
      toast.success(data.message || "Session signed out successfully");
      
      // If the current session was revoked, we'll reload which redirects to /login
      if (data.isCurrentRevoked) {
        window.location.reload();
      } else {
        await fetchSessions();
      }
      return true;
    } catch (err) {
      console.error("Failed to revoke session:", err);
      toast.error(err.response?.data?.message || "Failed to sign out session");
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchSessions]);

  const revokeOtherSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.delete("/profile/sessions/others");
      toast.success(data.message || "All other sessions signed out successfully");
      await fetchSessions();
      return true;
    } catch (err) {
      console.error("Failed to revoke other sessions:", err);
      toast.error(err.response?.data?.message || "Failed to sign out other sessions");
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchSessions]);

  const revokeCurrentSession = useCallback(async () => {
    setLoading(true);
    try {
      await apiClient.delete("/profile/sessions/current");
      toast.success("Successfully logged out from current session");
      window.location.reload();
      return true;
    } catch (err) {
      console.error("Failed to revoke current session:", err);
      toast.error(err.response?.data?.message || "Failed to log out");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    ...sessionsData,
    loading,
    error,
    refresh: fetchSessions,
    revokeSession,
    revokeOtherSessions,
    revokeCurrentSession,
  };
};
