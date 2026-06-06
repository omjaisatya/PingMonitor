import axios from "axios";
import {
  clearAuthStorage,
  clearCsrfToken,
  getAccessToken,
  getCsrfToken,
  setAccessToken,
  setCsrfToken,
} from "../utils/csrf";

const API = import.meta.env.VITE_SERVER_URL;

const apiClient = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.request.use((reqConfig) => {
  const activeJwt = getAccessToken();
  if (activeJwt) {
    reqConfig.headers.Authorization = `Bearer ${activeJwt}`;
  }

  const csrf = getCsrfToken();
  if (csrf) {
    reqConfig.headers["x-csrf-token"] = csrf;
  }

  return reqConfig;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    // const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message || "";

    if (
      status === 401 &&
      errorMessage.toLowerCase().includes("reuse detected")
    ) {
      clearAuthStorage();
      clearCsrfToken();
      processQueue(error, null);

      // dispatch a custom event so AuthProvider can react without tight coupling
      window.dispatchEvent(
        new CustomEvent("auth:session-compromised", {
          detail: { reason: "refresh_token_reuse" },
        }),
      );

      return Promise.reject(error);
    }

    // account locked
    if (status === 423) {
      return Promise.reject(error);
    }

    if (status === 403 && errorMessage.toLowerCase().includes("csrf")) {
      clearAuthStorage();
      clearCsrfToken();

      window.dispatchEvent(
        new CustomEvent("auth:session-compromised", {
          detail: { reason: "session_expired" },
        }),
      );

      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      if (originalRequest._retry || originalRequest.skipAuthRefresh) {
        clearAuthStorage();
        clearCsrfToken();
        window.dispatchEvent(
          new CustomEvent("auth:session-compromised", {
            detail: { reason: "session_expired" },
          }),
        );
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // request to refresh the access token
        const { data } = await axios.post(
          `${API}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              // include CSRF on the refresh call too
              "x-csrf-token": getCsrfToken() || "",
            },
          },
        );

        const { token: newAccessToken } = data;
        setAccessToken(newAccessToken);
        setCsrfToken(data.csrfToken);

        apiClient.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers["x-csrf-token"] = getCsrfToken();

        processQueue(null, newAccessToken);

        return apiClient(originalRequest);
      } catch (refreshError) {
        clearAuthStorage();
        clearCsrfToken();
        processQueue(refreshError, null);

        window.dispatchEvent(
          new CustomEvent("auth:session-compromised", {
            detail: { reason: "session_expired" },
          }),
        );

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
