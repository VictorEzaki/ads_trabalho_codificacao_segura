import axios from "axios";
import { getCookie } from "../utils/cookies";

const CSRF_COOKIE_NAME = "csrfToken";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);
const AUTH_SKIP_REFRESH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL + "/api",
  withCredentials: true,
});

let refreshPromise = null;

function shouldSkipRefresh(config) {
  const url = config?.url || "";
  const method = (config?.method || "get").toLowerCase();

  if (config?._skipAuthRefresh) {
    return true;
  }

  if (AUTH_SKIP_REFRESH_PATHS.some((path) => url.includes(path))) {
    return true;
  }

  if (method === "post" && /^\/?users\/?$/.test(url)) {
    return true;
  }

  return false;
}

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = getCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      config.headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest)
    ) {
      return Promise.reject(error);
    }

    // Sem cookie CSRF não existe sessão renovável ativa no navegador
    if (!getCookie(CSRF_COOKIE_NAME)) {
      window.dispatchEvent(new Event("auth:unauthorized"));
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api
          .post("/auth/refresh", null, { _skipAuthRefresh: true })
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;

      // Garante que a nova requisição utilize o cookie CSRF rotacionado
      if (originalRequest.headers) {
        delete originalRequest.headers[CSRF_HEADER_NAME];
      }

      return api(originalRequest);
    } catch (refreshError) {
      window.dispatchEvent(new Event("auth:unauthorized"));
      return Promise.reject(refreshError);
    }
  }
);

export default api;
