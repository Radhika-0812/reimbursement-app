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
  return http("/api/claims", { method: "POST", body: JSON.stringify(payload) });
}


export async function myPending() {
    const res = await http("/api/claims/me/pending", { method: "GET" });
    console.log("[pending]", res);
    return res;
  }
  

// You don't have a backend endpoint yet for "closed":
// export function myClosed() {
//   // Either implement /api/claims/me/closed in backend (see below)
//   // or temporarily return an empty list to avoid 404s.
//   return http("/api/claims/me/closed", { method: "GET" });
// }

// --- Admin endpoints stay as-is if your AdminClaimController matches them
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
