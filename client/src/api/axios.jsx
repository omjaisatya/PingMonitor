import axios from "axios";

const API = import.meta.env.VITE_SERVER_URL;

const apiClient = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((reqConfig) => {
  const activeJwt = localStorage.getItem("pm-token");

  if (activeJwt) {
    reqConfig.headers.Authorization = `Bearer ${activeJwt}`;
  }

  return reqConfig;
});

apiClient.interceptors.response.use(
  (networkResponse) => networkResponse,
  (networkError) => {
    if (networkError.response?.status === 401) {
      console.warn(
        "AuthInterceptor 401 caught, purging session ->",
        networkError.message,
      );

      localStorage.removeItem("pm-token");
      localStorage.removeItem("pm-user");
      // window.location.href = "/login";
    }

    return Promise.reject(networkError);
  },
);

export default apiClient;
