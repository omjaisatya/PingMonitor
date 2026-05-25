import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import apiClient from "../api/axios";
import { clearCsrfToken } from "../utils/csrf";
import { useCallback } from "react";

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isSessionResolving, setIsSessionResolving] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem("pm-token");
    localStorage.removeItem("pm-user");
    clearCsrfToken();
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    const handleSessionCompromised = (e) => {
      console.warn("Session compromised:", e.detail?.reason);
      clearSession();
    };

    window.addEventListener(
      "auth:session-compromised",
      handleSessionCompromised,
    );
    return () => {
      window.removeEventListener(
        "auth:session-compromised",
        handleSessionCompromised,
      );
    };
  }, [clearSession]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const cachedToken = localStorage.getItem("pm-token");
        const cachedUser = localStorage.getItem("pm-user");

        if (!cachedToken || !cachedUser) {
          setIsSessionResolving(false);
          return;
        }

        const response = await apiClient.get("/auth/me");
        const { user } = response.data;

        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (err) {
        console.error(
          "AuthProvider failed to parse cached session payload ->",
          err,
        );
        clearSession();
      } finally {
        setIsSessionResolving(false);
      }
    };

    restoreSession();
  }, [clearSession]);

  const establishSession = useCallback((userProfile, accessToken) => {
    try {
      localStorage.setItem("pm-token", accessToken);
      localStorage.setItem("pm-user", JSON.stringify(userProfile));
      setCurrentUser(userProfile);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("AuthProvider: failed to establish session ->", error);
      throw error;
    }
  }, []);

  const terminateSession = useCallback(async () => {
    try {
      await apiClient.post(
        "/auth/logout",
        {},
        {
          skipAuthRefresh: true,
        },
      );
    } catch (err) {
      console.error("AuthProvider: logout API error ->", err);
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const updateUser = useCallback((patch) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem("pm-user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const authState = {
    user: currentUser,
    isAuthenticated,
    login: establishSession,
    logout: terminateSession,
    updateUser,
    loading: isSessionResolving,
  };

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
};
