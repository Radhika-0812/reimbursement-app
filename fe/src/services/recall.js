// src/services/recall.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function getAuth() {
  const keys = [
    import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token",
    "access_token",
    "token",
    "jwt",
  ];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  const m = document.cookie.match(/(?:^|; )(?:auth_token|access_token)=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function http(method, path, { body, token, headers: extra } = {}) {
  const url = path.startsWith("http") ? path : API_BASE_URL + path;
  const headers = { ...(extra || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : headers["Content-Type"] === "application/json"
        ? JSON.stringify(body)
        : body,
    credentials: "include",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err = new Error(t || `HTTP ${res.status}`);
    err.status = res.status;
    err.responseText = t;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

/** ------- Admin side ------- **/

// Recall a claim (mark it back to "RECALL_REQUESTED")
export async function adminRecallClaim(claimId, { reason, requireAttachment = false } = {}) {
  const token = getAuth();
  return http("PATCH", `/api/admin/claims/${claimId}/recall`, {
    token,
    body: { reason, requireAttachment },
  });
}

// Optional: upload a file that explains recall (admin attachment)
export async function adminUploadRecallAttachment(claimId, file) {
  if (!file) return;
  const token = getAuth();
  const fd = new FormData();
  fd.append("file", file);
  return http("POST", `/api/admin/claims/${claimId}/recall/attachment`, {
    token,
    body: fd,
    headers: {}, // let browser set multipart
  });
}

/** ------- User side ------- **/

// User responds to recall (comment + optional file)
export async function userSendRecallResponse(claimId, { comment, file } = {}) {
  const token = getAuth();
  const fd = new FormData();
  if (comment) fd.append("comment", comment);
  if (file) fd.append("file", file);
  return http("POST", `/api/claims/${claimId}/recall-response`, {
    token,
    body: fd,
    headers: {},
  });
}
