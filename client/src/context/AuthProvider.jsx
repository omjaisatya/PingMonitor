import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import apiClient from "../api/axios";
import {
  clearAuthStorage,
  clearCsrfToken,
  getAccessToken,
  getCsrfToken,
  setAccessToken,
  setCsrfToken,
  setStoredUser,
} from "../utils/csrf";
import { useCallback } from "react";

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isSessionResolving, setIsSessionResolving] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const themePreference = currentUser?.themePreference || "dark";
    document.documentElement.dataset.theme = themePreference;
    document.documentElement.style.colorScheme = themePreference;
  }, [currentUser?.themePreference]);

  const clearSession = useCallback(() => {
    clearAuthStorage();
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
        const cachedToken = getAccessToken();

        if (!cachedToken) {
          if (!getCsrfToken()) {
            setIsSessionResolving(false);
            return;
          }

          const { data } = await apiClient.post(
            "/auth/refresh",
            {},
            { skipAuthRefresh: true },
          );
          setAccessToken(data.token);
          setCsrfToken(data.csrfToken);
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

  const establishSession = useCallback((userProfile, accessToken, csrfToken) => {
    try {
      setAccessToken(accessToken);
      setStoredUser(userProfile);
      setCsrfToken(csrfToken);
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
      setStoredUser(updated);
      return updated;
    });
  }, []);

  const updateTheme = useCallback(async (themePreference) => {
    const { data } = await apiClient.patch("/auth/profile/theme", {
      themePreference,
    });
    updateUser({ themePreference: data.themePreference });
    return data.themePreference;
  }, [updateUser]);

  const authState = {
    user: currentUser,
    isAuthenticated,
    login: establishSession,
    logout: terminateSession,
    updateUser,
    updateTheme,
    loading: isSessionResolving,
  };

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
};
