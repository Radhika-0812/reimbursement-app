// src/services/recall.js
/* Recall + attachment service helpers
 *
 * Maps to backend:
 *  - Admin request attachment: PATCH /api/admin/claims/:id/request-attachment  (body: { note })
 *  - Admin recall (no attachment required): PATCH /api/admin/claims/:id/recall (body: { reason })
 *  - Admin upload example/spec file (optional): POST /api/claims/:id/receipt (multipart "file")
 *  - User respond to recall:
 *      • with file or/and comment: PATCH /api/claims/:id/resubmit (multipart or JSON)
 *      • (alt path when admin required file) POST /api/claims/:id/attachments/missing (multipart "file")
 *  - User change request (no recall button): POST /api/claims/:id/change-request (body: { message })
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://reimbursement-app-7wy3.onrender.com";
const AUTH_TOKEN_KEYS = [
  import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token",
  "access_token",
  "token",
  "jwt",
];

function getAuth() {
  for (const k of AUTH_TOKEN_KEYS) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  const m = document.cookie.match(/(?:^|; )(?:auth_token|access_token)=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function request(method, path, { json, formData, headers: extra } = {}) {
  const url = path.startsWith("http") ? path : API_BASE_URL + path;
  const headers = { ...(extra || {}) };
  const token = getAuth();
  if (token) headers.Authorization = `Bearer ${token}`;
  // Only set JSON content-type when sending JSON
  if (json && !formData) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: formData
      ? formData
      : json
      ? JSON.stringify(json)
      : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || `HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.responseText = text;
    throw err;
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

/* ---------------- Admin: recall / need attachment ---------------- */

/** Admin: one function used by RecallDialog
 *  If requireAttachment = true → hits /request-attachment (with note)
 *  Else → hits /recall (with reason)
 */
export async function adminRecallClaim(claimId, { reason, requireAttachment } = {}) {
  const id = String(claimId);
  const r = (reason || "").trim();
  if (!r) throw new Error("Reason is required");

  // Use the single /recall endpoint that accepts { reason, requireAttachment }
  return request("PATCH", `/api/admin/claims/${id}/recall`, {
    json: { reason: r, requireAttachment: !!requireAttachment },
  });}


export async function adminUploadRecallAttachment(claimId, file) {
  if (!file) throw new Error("file is required");
  const id = String(claimId);
  const fd = new FormData();
  fd.append("file", file);
  return request("POST", `/api/claims/${id}/receipt`, { formData: fd });
}

/* ---------------- User: respond to recall ---------------- */

/** User: send recall response (comment and/or file).
 *  - If a file is provided → send multipart to /resubmit so backend clears recall.
 *  - Else → send JSON to /resubmit.
 *  (Alternate for strict "attachment required" flows is provided below.)
 */
export async function userSendRecallResponse(claimId, { comment, file } = {}) {
  const id = String(claimId);
  const c = (comment || "").trim();

  if (file) {
    const fd = new FormData();
    fd.append("comment", c);
    fd.append("file", file);
    return request("PATCH", `/api/claims/${id}/resubmit`, { formData: fd });
  } else {
    return request("PATCH", `/api/claims/${id}/resubmit`, { json: { comment: c } });
  }
}

/** (Optional) When admin explicitly required an attachment, you may choose this path.
 *  It stores the file and also clears recall → back to PENDING.
 */
export async function userUploadMissingAttachment(claimId, file) {
  if (!file) throw new Error("file is required");
  const id = String(claimId);
  const fd = new FormData();
  fd.append("file", file);
  return request("POST", `/api/claims/${id}/attachments/missing`, { formData: fd });
}

/** User: raise a change request (no recall).
 *  Stores message on the claim (resubmitComment) for admin to review.
 */
export async function userCreateChangeRequest(claimId, message) {
  const id = String(claimId);
  const msg = (message || "").trim();
  if (!msg) throw new Error("message is required");
  return request("POST", `/api/claims/${id}/change-request`, { json: { message: msg } });
}

/* ---------------- Utilities ---------------- */

/** HEAD probe via the standard receipt route. */
export async function receiptExists(claimId) {
  const id = String(claimId);
  const url = API_BASE_URL + `/api/claims/${id}/receipt`;
  const token = getAuth();
  const res = await fetch(url, {
    method: "HEAD",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  return res.ok;
}
