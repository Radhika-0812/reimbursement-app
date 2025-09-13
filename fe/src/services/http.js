// src/services/http.js

// 1) Build the base from Vite env (outside of src/.env.local)
const raw = (import.meta.env?.VITE_API_BASE ?? "").toString().trim();
export const API_BASE = raw.replace(/\/$/, "");

// 2) Helpful logs (dev only) + expose for con
if (import.meta.env.DEV) {
  console.info("[HTTP] API_BASE =", API_BASE || "(empty)");
  // Expose a read-only alias so you can check it from the console:
  // type:  window.__API_BASE__
  Object.defineProperty(window, "__API_BASE__", { value: API_BASE, writable: false });
}

export function authHeader() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function http(path, { method = "GET", headers = {}, body, ...rest } = {}) {
  const url = /^https?:\/\//i.test(path) ? path : `${API_BASE}${path}`;
  const h = { "Content-Type": "application/json", ...authHeader(), ...headers };

  const res = await fetch(url, { method, headers: h, body, ...rest });

  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error((await res.text()) || res.statusText);

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}
