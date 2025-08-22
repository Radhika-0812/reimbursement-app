// Claims API: batch create, my lists, admin actions
import { http } from "./http";

// items: [{ title, amountCents, claimType, description?, receiptUrl? }]
export function createBatch(items) {
  const payload = (items || []).map((x) => ({
    title: String(x.title ?? ""),
    amountCents: Math.round(Number(x.amountCents ?? 0)),
    claimType: String(x.claimType),
    description: x.description ? String(x.description) : undefined,
    receiptUrl: x.receiptUrl ? String(x.receiptUrl) : undefined,
  }));
  // BACKEND: @PostMapping("/") => POST /api/claims
  // (If your backend uses /api/claims/batch, change the URL here to match)
  return http("/api/claims", { method: "POST", body: JSON.stringify(payload) });
}

export function myPending() {
  // returns array or Page depending on backend; your context already normalizes
  return http("/api/claims/me/pending", { method: "GET" });
}

export function myClosed() {
  // returns array or Page depending on backend; your context already normalizes
  return http("/api/claims/me/closed", { method: "GET" });
}


// ✅ Changed to use the same http wrapper (keeps auth/headers consistent)
export function myApproved() {
  return http("/api/claims/me/approved", { method: "GET" });
}

export function myRejected() {
  return http("/api/claims/me/rejected", { method: "GET" });
}

// --- Admin endpoints (unchanged)
export function adminCounts() {
  return http("/api/admin/claims/counts", { method: "GET" });
}
export function listPendingForAll() {
  return http("/api/admin/claims?status=PENDING", { method: "GET" });
}
export function approveClaim(id) {
  return http(`/api/admin/claims/${id}/approve`, { method: "POST" });
}
export function rejectClaim(id, reason = "") {
  return http(`/api/admin/claims/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
