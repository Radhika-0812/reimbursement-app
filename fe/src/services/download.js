// src/services/download.js
import { API_BASE, authHeader } from "./http";

function filenameFromHeader(res, fallback) {
  const cd = res.headers.get("content-disposition") || "";
  const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i);
  const name = decodeURIComponent(m?.[1] || m?.[2] || "");
  return name || fallback;
}

export async function downloadToDisk(path, filename) {
  const res = await fetch(`${API_BASE}${path}`, { method: "GET", headers: { ...authHeader() } });
  const ok = res.ok;
  const ct = res.headers.get("content-type") || "";
  if (!ok) {
    const msg = ct.includes("text/") || ct.includes("json") ? await res.text() : `HTTP ${res.status}`;
    throw new Error(msg || "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filenameFromHeader(res, filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
