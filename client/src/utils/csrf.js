const CSRF_STORAGE_KEY = "pm-csrf-token";
const ACCESS_TOKEN_KEY = "pm-token";
const REFRESH_TOKEN_KEY = "pm-refresh-token";
const USER_KEY = "pm-user";

export const getAccessToken = () => {
  const sessionToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (sessionToken) return sessionToken;

  const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  return storedToken;
};

export const setAccessToken = (token) => {
  if (!token) return;
  const rememberMe = localStorage.getItem("pingmonitor_remember_me") === "true";
  if (rememberMe) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};

export const getRefreshToken = () => {
  const sessionToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (sessionToken) return sessionToken;

  const storedToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  return storedToken;
};

export const setRefreshToken = (token) => {
  if (!token) return;
  const rememberMe = localStorage.getItem("pingmonitor_remember_me") === "true";
  if (rememberMe) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const getStoredUser = () => localStorage.getItem(USER_KEY);

export const setStoredUser = (userProfile) => {
  if (!userProfile) return;
  const cacheableProfile = { ...userProfile };
  delete cacheableProfile.themePreference;
  localStorage.setItem(USER_KEY, JSON.stringify(cacheableProfile));
};

export const clearAuthStorage = () => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getCsrfToken = () => {
  const storedToken = localStorage.getItem(CSRF_STORAGE_KEY);
  if (storedToken) return storedToken;

  const match = document.cookie.match(/(?:^|;\s*)pm_csrf_token=([^;]*)/);

  return match ? decodeURIComponent(match[1]) : null;
};

export const setCsrfToken = (token) => {
  if (!token) return;
  localStorage.setItem(CSRF_STORAGE_KEY, token);
};

export const clearCsrfToken = () => {
  localStorage.removeItem(CSRF_STORAGE_KEY);
  document.cookie = "pm_csrf_token=; Max-Age=0; path=/; SameSite=Strict";
  document.cookie = "pm_csrf_token=; Max-Age=0; path=/; SameSite=Lax";
  document.cookie = "pm_csrf_token=; Max-Age=0; path=/; SameSite=None; Secure";
};
