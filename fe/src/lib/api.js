// src/lib/api.js
import axios from "axios";

// Read env from Vite or CRA
const API_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "http://localhost:8080";

const USE_COOKIES =
  ((typeof import.meta !== "undefined" && import.meta.env?.VITE_USE_COOKIES) ||
   (typeof process !== "undefined" && process.env?.REACT_APP_USE_COOKIES) ||
   "false") === "true";

// Simple token store (only used when not using cookies)
export const tokenStore = {
  get: () => localStorage.getItem("auth_token"),
  set: (t) => (t ? localStorage.setItem("auth_token", t) : localStorage.removeItem("auth_token")),
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: USE_COOKIES, // true only if BE uses HttpOnly cookies
  headers: { "Content-Type": "application/json" },
});

// Attach Bearer token (make sure to keep the backticks)
api.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (!USE_COOKIES && t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// ✅ Exported so AuthContext can import it
export function inject401Handler(onLogout) {
  api.interceptors.response.use(
    (r) => r,
    (err) => {
      if (err?.response?.status === 401) onLogout?.();
      return Promise.reject(err);
    }
  );
}

export default api;
