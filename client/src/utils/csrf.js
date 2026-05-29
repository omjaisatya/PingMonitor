const CSRF_STORAGE_KEY = "pm-csrf-token";
const ACCESS_TOKEN_KEY = "pm-token";
const USER_KEY = "pm-user";

export const getAccessToken = () => {
  const sessionToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (sessionToken) return sessionToken;

  const legacyToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (legacyToken) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, legacyToken);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  return legacyToken;
};

export const setAccessToken = (token) => {
  if (!token) return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const getStoredUser = () => localStorage.getItem(USER_KEY);

export const setStoredUser = (userProfile) => {
  if (!userProfile) return;
  localStorage.setItem(USER_KEY, JSON.stringify(userProfile));
};

export const clearAuthStorage = () => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
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
  document.cookie = "pm_csrf_token=; Max-Age=0; path=/; SameSite=None; Secure";
};
