// src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { downloadToDisk } from "../services/download";
import { toast } from "../lib/toast";
import {
  centsFromClaim,
  formatCentsForClaim,
  formatCents,
  currencyOfClaim,
} from "../lib/money";
import { C_CHAR, C_STEEL } from "../theme/palette";
import RecallDialog from "../components/RecallDialog";

/* ===== Semantic colors ===== */
const FG = "var(--foreground)";
const BG = "var(--background)";
const PRI = "var(--primary)";
const PRI_FG = "var(--primary-foreground)";
const C_TAUPE = C_CHAR;     // secondary (reject)
const C_EGGSHELL = C_STEEL; // input bg
const BORDER = FG;          // borders
const SURFACE = BG;         // surfaces

/* ===== Shared control styling for Year/Month/Refresh ===== */
const CONTROL_CLS =
  "h-9 px-3 rounded border text-sm w-[140px] sm:w-[160px]";
const CONTROL_STYLE = {
  background: C_EGGSHELL,
  borderColor: BORDER,
  borderWidth: 1,
  color: FG,
};

/* ===== Config ===== */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://reimbursement-app-7wy3.onrender.com";
const ENDPOINTS = {
  pending: "/api/admin/claims/pending",
  approved: "/api/admin/claims/approved",
  rejected: "/api/admin/claims/rejected",
  recalled: "/api/admin/claims/recalled",
  approveTpl: "/api/admin/claims/:id/approve",
  rejectTpl: "/api/admin/claims/:id/reject",
  adminExport: "/api/admin/claims/export",
};
const AUTH_TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token";
const PAGE_SIZE = 10;
const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED","RECALLED"];
const STATUS_TO_ENDPOINT = {
  PENDING: ENDPOINTS.pending,
  APPROVED: ENDPOINTS.approved,
  REJECTED: ENDPOINTS.rejected,
  RECALLED: ENDPOINTS.recalled, 
};
const EMAIL_PARAM_KEYS = ["email", "userEmail", "user_email", "user"];

/* ===== Utils ===== */
async function http(method, path, { body, token, headers: extraHeaders } = {}) {
  const url = path.startsWith("http") ? path : API_BASE_URL + path;
  const headers = { ...(extraHeaders || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && headers["Content-Type"] === undefined) {
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
    const text = await res.text().catch(() => "");
    const err = new Error(text || `HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.responseText = text;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

function getAuth() {
  const keys = [AUTH_TOKEN_KEY, "access_token", "token", "jwt"];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  const m = document.cookie.match(/(?:^|; )(?:auth_token|access_token)=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function firstNonEmpty(...candidates) {
  for (const v of candidates) {
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s !== "") return s;
    }
  }
  return "—";
}
const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
function extractEmailDeep(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 2) return null;
  for (const [, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (typeof v === "string" && EMAIL_RE.test(v)) return v;
    if (typeof v === "object") {
      const nested = extractEmailDeep(v, depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}
function displayUserName(c) {
  return firstNonEmpty(
    c.userName,
    c.user_name,
    c.user?.name,
    c.user?.fullName,
    c.user?.username,
    c.name,
    c.fullName
  );
}
function displayUserEmail(c) {
  return firstNonEmpty(
    c.userEmail,
    c.user_email,
    c.email,
    c.user?.email,
    extractEmailDeep(c)
  );
}
function displayDesignation(c) {
  return firstNonEmpty(
    c.designation,
    c.userDesignation,
    c.user_designation,
    c.user?.designation
  );
}
function withinRange(dateStr, from, to) {
  if (!from && !to) return true;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return true;
  if (from && d < new Date(from)) return false;
  if (to && d > new Date(to + "T23:59:59")) return false;
  return true;
}
function monthBounds(year, month /* "01".."12" */) {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m) return { from: "", to: "" };
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  const toISO = (dt) => dt.toISOString().slice(0, 10);
  return { from: toISO(start), to: toISO(end) };
}
function mergeEmails(prev, additions) {
  const map = new Map(prev.map((x) => [x.email.toLowerCase(), x]));
  for (const a of additions) {
    if (!a?.email) continue;
    const k = a.email.toLowerCase();
    if (!map.has(k)) map.set(k, a);
  }
  return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
}

/* ===== KPIs ===== */
function Kpi({ label, value }) {
  return (
    <div
      className="rounded-[1.25rem] border p-4"
      style={{ background: SURFACE, borderColor: BORDER, borderWidth: 1, color: FG }}
    >
      <div className="text-sm" style={{ color: `${FG}B3` }}>{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

/* ===== Tiny confirm toast ===== */
function ConfirmToast({ open, kind, comment, onConfirm, onCancel }) {
  if (!open) return null;
  const title = kind === "approve" ? "Approve this claim?" : "Reject this claim?";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      <div
        className="max-w-sm w-[360px] border rounded-xl p-4 pointer-events-auto shadow-2xl"
        style={{ background: SURFACE, borderColor: BORDER, borderWidth: 1, color: FG }}
      >
        <div className="font-medium text-base">{title}</div>
        {kind === "reject" && comment && (
          <div className="mt-1 text-xs" style={{ color: `${FG}99` }}>
            Reason: <span style={{ color: FG }}>{comment}</span>
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded border text-sm cursor-pointer"
            style={{ borderColor: BORDER, borderWidth: 1, background: C_EGGSHELL, color: FG }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded text-sm cursor-pointer"
            style={{ background: kind === "approve" ? PRI : C_TAUPE, color: PRI_FG }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Fullscreen preview overlay (image/PDF) ===== */
function FullscreenPreview({ open, onClose, preview }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-2 overflow-y-auto"
      onClick={onClose}
      style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
    >
      <button
        aria-label="Close"
        className="absolute top-4 right-4 px-3 py-2 rounded cursor-pointer"
        style={{ background: PRI, color: PRI_FG }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        ✕
      </button>

      <div
        className="max-w-[95vw] w-full max-h-[92svh] rounded-lg border overflow-auto p-2"
        style={{ background: SURFACE, borderColor: BORDER, borderWidth: 1, WebkitOverflowScrolling: "touch" }}
        onClick={(e) => e.stopPropagation()}
      >
        {preview?.supported ? (
          preview.contentType.includes("pdf") ? (
            <iframe title="Receipt PDF" src={preview.url} className="w-full h-[85svh] border-0 rounded-lg" />
          ) : (
            <img src={preview.url} alt="Receipt" className="block max-w-none rounded-lg" />
          )
        ) : (
          <div className="text-white">Preview not available</div>
        )}
      </div>
    </div>
  );
}

/* ===== Details modal with inline preview + fullscreen expand ===== */
function DetailsModal({ open, claim, onClose, onApprove, onReject, token, canAct }) {
  const [preview, setPreview] = useState({ url: "", contentType: "", filename: "", has: false, supported: false });
  const [rejectComment, setRejectComment] = useState("");
  const [rejectNeedsComment, setRejectNeedsComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, kind: null });
  const [full, setFull] = useState(false);
  const firstBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setRejectComment("");
    setRejectNeedsComment(false);
    setSubmitting(false);
    setConfirm({ open: false, kind: null });
    setFull(false);
    setTimeout(() => firstBtnRef.current?.focus(), 50);
  }, [open]);

  function parseFilename(cd) {
    if (!cd) return "";
    const star = cd.match(/filename\*=(?:UTF-8''|)([^;]+)/i);
    if (star && star[1]) {
      try { return decodeURIComponent(star[1].replace(/^"|"$/g, "")); } catch {}
      return star[1].replace(/^"|"$/g, "");
    }
    const normal = cd.match(/filename="?([^"]+)"?/i);
    return normal ? normal[1] : "";
  }

  useEffect(() => {
    let revokeUrl = null;
    async function load() {
      setPreview({ url: "", contentType: "", filename: "", has: false, supported: false });
      if (!open || !claim?.id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/claims/${claim.id}/receipt`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) { setPreview({ url: "", contentType: "", filename: "", has: false, supported: false }); return; }
        const ct = res.headers.get("content-type") || "";
        const cd = res.headers.get("content-disposition") || "";
        const filename = parseFilename(cd) || `receipt-${claim.id}`;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob); revokeUrl = url;
        const isImage = ct.startsWith("image/"); const isPdf = ct.includes("pdf");
        setPreview({ url, contentType: ct, filename, has: true, supported: isImage || isPdf });
      } catch {
        setPreview({ url: "", contentType: "", filename: "", has: false, supported: false });
      }
    }
    load();
    return () => { if (revokeUrl) URL.revokeObjectURL(revokeUrl); };
  }, [open, claim?.id, token]);

  function downloadUnsupported() {
    if (!preview.url) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = preview.filename || `receipt-${claim?.id || ""}`;
    a.rel = "noopener"; a.target = "_self";
    document.body.appendChild(a); a.click(); a.remove();
  }

  if (!open || !claim) return null;

  const amountStr = formatCentsForClaim(claim);
  const submittedAt = new Date(claim.createdAt ?? claim.created_at ?? Date.now()).toLocaleString();
  const isRejected = String(claim?.status).toUpperCase() === "REJECTED";
  const adminComment = firstNonEmpty(claim?.adminComment, claim?.admin_comment);

  async function confirmAndApprove() {
    setSubmitting(true);
    try { await onApprove(claim); } finally { setSubmitting(false); setConfirm({ open: false, kind: null }); }
  }
  async function confirmAndReject() {
    const comment = (rejectComment || "").trim();
    if (!comment) { toast("Need comments", { type: "warning" }); return; }
    setSubmitting(true);
    try { await onReject(claim, comment); } finally { setSubmitting(false); setConfirm({ open: false, kind: null }); }
  }

  return (
    <>
      {/* Overlay is scrollable so large cards never overflow off-screen */}
      <div
        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
      >
        {/* The card itself is also scrollable and capped to viewport height */}
        <div
          className="w-full max-w-4xl rounded-2xl border shadow-xl overflow-y-auto max-h-[90svh]"
          style={{
            background: SURFACE,
            borderColor: BORDER,
            borderWidth: 1,
            color: FG,
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between sticky top-0 z-10"
            style={{ borderColor: BORDER, borderWidth: 1, background: SURFACE, color: FG }}
          >
            <div className="text-lg font-semibold">Claim Details</div>
            <button
              className="px-3 py-1 rounded border cursor-pointer"
              style={{ borderColor: BORDER, borderWidth: 1, background: C_EGGSHELL, color: FG }}
              onClick={onClose}
              ref={firstBtnRef}
            >
              Close
            </button>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div><span className="text-xs" style={{ color: `${FG}99` }}>User</span><div className="font-medium">{displayUserName(claim)}</div></div>
              <div><span className="text-xs" style={{ color: `${FG}99` }}>Email</span><div className="font-medium">{displayUserEmail(claim)}</div></div>
              <div><span className="text-xs" style={{ color: `${FG}99` }}>Designation</span><div className="font-medium">{displayDesignation(claim)}</div></div>
              <div><span className="text-xs" style={{ color: `${FG}99` }}>Title</span><div className="font-medium">{claim.title || "—"}</div></div>
              <div><span className="text-xs" style={{ color: `${FG}99` }}>Type</span><div className="font-medium">{claim.claimType || "—"}</div></div>
              <div><span className="text-xs" style={{ color: `${FG}99` }}>Amount</span><div className="font-medium">{amountStr}</div></div>
              <div><span className="text-xs" style={{ color: `${FG}99` }}>Submitted</span><div className="font-medium">{submittedAt}</div></div>
              {isRejected && adminComment !== "—" && (
                <div>
                  <span className="text-xs" style={{ color: `${FG}99` }}>Admin comment</span>
                  <div className="whitespace-pre-wrap text-sm" style={{ color: "#b91c1c" }}>{adminComment}</div>
                </div>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden" style={{ borderColor: BORDER, borderWidth: 1 }}>
              <div className="px-3 py-2 text-sm border-b" style={{ borderColor: BORDER, background: SURFACE, color: FG }}>
                Receipt
              </div>

              {/* Scrollable preview area (desktop + mobile) */}
              <div
                className="p-3 min-h-64 max-h-[60svh] overflow-auto flex items-center justify-center"
                style={{ background: C_EGGSHELL, WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
              >
                {!preview.has && <div className="text-sm" style={{ color: `${FG}99` }}>No receipt uploaded.</div>}
                {preview.has && preview.supported && (
                  preview.contentType.includes("pdf")
                    ? <iframe title="Receipt PDF" src={preview.url} className="w-full h-[56svh] border-0 rounded" />
                    : <img src={preview.url} alt="Receipt" className="block max-w-none rounded" />
                )}
                {preview.has && !preview.supported && (
                  <div className="text-center">
                    <div className="text-sm mb-3" style={{ color: `${FG}99` }}>
                      Preview not supported for this file type
                      <span className="block text-xs mt-1">({preview.contentType || "unknown"})</span>
                    </div>
                    <button onClick={downloadUnsupported} className="px-3 py-2 rounded cursor-pointer" style={{ background: PRI, color: PRI_FG }}>
                      Download file
                    </button>
                  </div>
                )}
              </div>

              <div className="px-3 py-2 flex items-center justify-between border-t" style={{ color: `${FG}99`, borderColor: BORDER }}>
                <div>{preview.supported ? "View-only preview shown. Expand for fullscreen." : "Preview unavailable; download provided."}</div>
                {preview.has && preview.supported && (
                  <button className="px-3 py-1.5 rounded cursor-pointer" style={{ background: PRI, color: PRI_FG }} onClick={() => setFull(true)}>
                    Expand
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
               style={{ borderColor: BORDER, background: SURFACE }}>
            {canAct ? (
              <>
                <div className="flex-1">
                  <label className="text-sm" style={{ color: `${FG}CC` }}>Reject reason (required to reject)</label>
                  <textarea
                    rows={2}
                    value={rejectComment}
                    onChange={(e) => { setRejectComment(e.target.value); if (rejectNeedsComment && e.target.value.trim()) setRejectNeedsComment(false); }}
                    className="w-full mt-1 p-2 rounded border"
                    style={{ background: C_EGGSHELL, borderColor: BORDER, borderWidth: 1, color: FG }}
                    placeholder="Explain why this claim is rejected"
                  />
                  {rejectNeedsComment && !rejectComment.trim() && (
                    <div className="text-xs mt-1" style={{ color: "#b91c1c" }}>Comment is required to reject.</div>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <button className="px-4 py-2 rounded border cursor-pointer"
                          style={{ borderColor: BORDER, borderWidth: 1, background: C_EGGSHELL, color: FG }}
                          onClick={onClose}
                          disabled={submitting}>
                    Close
                  </button>
                  <button className="px-4 py-2 rounded cursor-pointer" style={{ background: PRI, color: PRI_FG }}
                          onClick={() => setConfirm({ open: true, kind: "approve" })}
                          disabled={submitting}>
                    Approve
                  </button>
                  <button className="px-4 py-2 rounded cursor-pointer" style={{ background: C_TAUPE, color: PRI_FG }}
                          onClick={() => {
                            const comment = (rejectComment || "").trim();
                            if (!comment) { setRejectNeedsComment(true); toast("Need comments", { type: "warning" }); return; }
                            setConfirm({ open: true, kind: "reject" });
                          }}
                          disabled={submitting}>
                    Reject
                  </button>
                </div>
              </>
            ) : (
              <div className="flex justify-end w-full">
                <button className="px-4 py-2 rounded border cursor-pointer"
                        style={{ borderColor: BORDER, borderWidth: 1, background: C_EGGSHELL, color: FG }}
                        onClick={onClose}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>

        <ConfirmToast
          open={confirm.open}
          kind={confirm.kind}
          comment={(rejectComment || "").trim()}
          onCancel={() => setConfirm({ open: false, kind: null })}
          onConfirm={confirm.kind === "approve" ? confirmAndApprove : confirmAndReject}
        />
      </div>

      <FullscreenPreview open={full} onClose={() => setFull(false)} preview={preview} />
    </>
  );
}

/* ========================= Page ========================= */
export default function AdminDashboard() {
  const token = getAuth();

  // Filters (global)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const [emailOptions, setEmailOptions] = useState([]);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // Table state
  const [statusTab, setStatusTab] = useState("PENDING");
  const [rows, setRows] = useState([]);
 const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);

  // KPIs
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [kpiSums, setKpiSums] = useState({ INR: 0, MYR: 0 });

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClaim, setDetailClaim] = useState(null);

  // Recall modal (admin)
  const [recallClaim, setRecallClaim] = useState(null);

  // Loading/Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [format, setFormat] = useState("xlsx");

  /* Build query params for list/export */
  const buildParams = (extra = {}) => {
    const params = new URLSearchParams({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...extra,
    });
    if (email) EMAIL_PARAM_KEYS.forEach((k) => params.set(k, email));
    return params;
  };

  /* ===== KPIs: counts + currency totals honoring filters ===== */
  async function fetchKpis() {
    const statuses = ["PENDING", "APPROVED", "REJECTED","RECALLED"];
    const countsAcc = { pending: 0, approved: 0, rejected: 0 ,recalled: 0 };
    const sums = { INR: 0, MYR: 0 };
    const PAGE_SIZE_FOR_KPI = 200;

    for (const s of statuses) {
      const endpoint = STATUS_TO_ENDPOINT[s];
      let pageIdx = 0;
      let totalPages = 1;

      do {
        const params = new URLSearchParams({
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          page: String(pageIdx),
          size: String(PAGE_SIZE_FOR_KPI),
        });
        if (email) EMAIL_PARAM_KEYS.forEach((k) => params.set(k, email));

        const data = await http("GET", `${endpoint}?${params.toString()}`, { token });
        const content = Array.isArray(data) ? data : (data?.content ?? []);

        const filtered = content.filter((row) => {
          const emailOk = email ? (displayUserEmail(row) || "").toLowerCase() === email.toLowerCase() : true;
          const created = row.createdAt ?? row.created_at ?? row.submittedAt ?? row.submitted_at;
          const dateOk = withinRange(created, from, to);
          return emailOk && dateOk;
        });

        const inc = filtered.length;
        if (s === "PENDING") countsAcc.pending += inc;
        else if (s === "APPROVED") countsAcc.approved += inc;
        else if (s === "RECALLED") countsAcc.recalled += inc; 
        else countsAcc.rejected += inc;
        

        for (const r of filtered) {
          const cur = (currencyOfClaim(r) || "").toUpperCase();
          const cents = centsFromClaim(r);
          if (cur === "INR") sums.INR += cents;
          else if (cur === "MYR") sums.MYR += cents;
        }

        totalPages = data?.totalPages ?? (content.length < PAGE_SIZE_FOR_KPI ? pageIdx + 1 : pageIdx + 2);
        pageIdx += 1;
        if (pageIdx > 50) break; // cap
      } while (pageIdx < totalPages);
    }

    setCounts(countsAcc);
    setKpiSums(sums);
  }

  /* Table list with server query + client fallback filter */
  async function fetchList(currentStatus = statusTab, currentPage = 1) {
    const endpoint = STATUS_TO_ENDPOINT[currentStatus] || ENDPOINTS.pending;

    const params = buildParams({ page: currentPage - 1, size: PAGE_SIZE });
    const data = await http("GET", `${endpoint}?${params.toString()}`, { token });
    const content = Array.isArray(data) ? data : (data?.content ?? []);

    const filtered = content.filter((row) => {
      const emailOk = email ? (displayUserEmail(row) || "").toLowerCase() === email.toLowerCase() : true;
      const created = row.createdAt ?? row.created_at ?? row.submittedAt ?? row.submitted_at;
      const dateOk = withinRange(created, from, to);
      return emailOk && dateOk;
    });

    setRows(filtered);

    const serverTotal = data?.totalElements ?? content.length;
    const effectiveTotal = email || from || to ? filtered.length : serverTotal;
    setTotal(effectiveTotal);
    setPageCount(Math.max(1, Math.ceil(effectiveTotal / PAGE_SIZE)));

    const fromRows = content
      .map((c) => ({ email: displayUserEmail(c), name: displayUserName(c) }))
      .filter((x) => x.email && EMAIL_RE.test(x.email));
    setEmailOptions((prev) => mergeEmails(prev, fromRows));
  }

  /* Collect more emails across statuses/pages to populate dropdown better */
  async function hydrateEmailOptions() {
    try {
      const statuses = STATUS_OPTIONS;
      const merged = [];
      for (const s of statuses) {
        const endpoint = STATUS_TO_ENDPOINT[s];
        for (let p = 0; p < 3; p++) {
          const params = buildParams({ page: p, size: 50 });
          const data = await http("GET", `${endpoint}?${params.toString()}`, { token });
          const content = Array.isArray(data) ? data : (data?.content ?? []);
          for (const c of content) {
            const email = displayUserEmail(c);
            const name = displayUserName(c);
            if (email && EMAIL_RE.test(email)) merged.push({ email, name });
          }
          const totalPages = data?.totalPages ?? 1;
          if (p + 1 >= totalPages) break;
        }
      }
      setEmailOptions((prev) => mergeEmails(prev, merged));
    } catch {
      /* best-effort; ignore */
    }
  }

  /* Download — if email selected, guarantee filtered data via client-side CSV */
  async function runExport() {
    try {
      if (email) {
        const statuses = status ? [status] : STATUS_OPTIONS;
        const all = [];
        for (const s of statuses) {
          const endpoint = STATUS_TO_ENDPOINT[s];
          let p = 0;
          let totalPages = 1;
          do {
            const params = buildParams({ page: p, size: 100 });
            const data = await http("GET", `${endpoint}?${params.toString()}`, { token });
            const content = Array.isArray(data) ? data : (data?.content ?? []);
            for (const r of content) {
              const e = (displayUserEmail(r) || "").toLowerCase();
              if (e !== email.toLowerCase()) continue;
              const created = r.createdAt ?? r.created_at ?? r.submittedAt ?? r.submitted_at;
              if (!withinRange(created, from, to)) continue;
              all.push(r);
            }
            totalPages = data?.totalPages ?? 1;
            p++;
          } while (p < totalPages);
        }

        const lines = [
          ["User Name","Email","Designation","Title","Amount","Status","Created At"].join(",")
        ];
        for (const r of all) {
          const row = [
            displayUserName(r),
            displayUserEmail(r),
            displayDesignation(r),
            r.title ?? "",
            String(centsFromClaim(r)),
            r.status ?? "",
            (r.createdAt ?? r.created_at ?? "").toString(),
          ].map(v => `"${String(v ?? "").replace(/"/g,'""')}"`);
          lines.push(row.join(","));
        }
        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
        const name = `claims_${from || "all"}_to_${to || "all"}${status ? `_${status.toLowerCase()}` : ""}_${email.replace(/[@.]/g,"-")}.csv`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        toast(`Downloaded ${all.length} row(s) for ${email}`, { type: "success" });
        return;
      }

      // No email filter → use server export as-is
      const params = buildParams({ format, ...(status ? { status } : {}) });
      const name = `claims_${from || "all"}_to_${to || "all"}${status ? `_${status.toLowerCase()}` : ""}.` + format;
      await downloadToDisk(`${ENDPOINTS.adminExport}?${params.toString()}`, name);
      toast("Download started", { type: "success" });
    } catch (e) {
      setError(e.message || String(e));
      toast(e.message || "Download failed", { type: "error" });
    }
  }

  /* Approve/Reject */
  const buildUrl = (tpl, id) => tpl.replace(":id", String(id));
  async function doApprove(claim) {
    try {
      await http("PATCH", buildUrl(ENDPOINTS.approveTpl, claim.id), { token });
      await Promise.all([fetchKpis(), fetchList(statusTab, page)]);
      toast("Approved successfully", { type: "success" });
      setDetailOpen(false); setDetailClaim(null);
    } catch (e) {
      setError(e.message || String(e));
      toast(e.responseText || e.message || "Approve failed", { type: "error" });
    }
  }
  async function doReject(claim, comment) {
    try {
      await http("PATCH", buildUrl(ENDPOINTS.rejectTpl, claim.id), { token, body: { adminComment: comment } });
      await Promise.all([fetchKpis(), fetchList(statusTab, page)]);
      toast("Rejected successfully", { type: "success" });
      setDetailOpen(false); setDetailClaim(null);
    } catch (e) {
      setError(e.message || String(e));
      toast(e.responseText || e.message || "Reject failed", { type: "error" });
    }
  }

  /* Initial load */
  useEffect(() => {
    (async () => {
      try {
        if (!token) { setError("Not authenticated. Please sign in as an admin."); toast("Admin auth required", { type: "error" }); return; }
        await fetchKpis();
        await fetchList("PENDING", 1);
        hydrateEmailOptions(); // best-effort to fill dropdown
      } catch (e) {
        setError(e.message || String(e));
        toast(e.message || "Failed to load", { type: "error" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global Year/Month -> snap From/To
  useEffect(() => {
    if (month && (year || new Date().getFullYear())) {
      const y = year || String(new Date().getFullYear());
      const { from: f, to: t } = monthBounds(y, month);
      setFrom(f);
      setTo(t);
    }
  }, [month, year]);

  // Refresh counts/table whenever filters change
  useEffect(() => {
    setPage(1);
    setLoading(true);
    (async () => {
      try {
        await Promise.all([fetchKpis(), fetchList(statusTab, 1)]);
      } catch (e) {
        setError(e.message || String(e));
        toast(e.message || "Failed to load", { type: "error" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, from, to, statusTab]);

  async function onChangeStatusTab(next) {
    setStatusTab(next);
    setPage(1);
    setLoading(true);
    try { await fetchList(next, 1); }
    catch (e) { setError(e.message || String(e)); toast(e.message || "Failed to load", { type: "error" }); }
    finally { setLoading(false); }
  }

  const headerLabel = statusTab[0] + statusTab.slice(1).toLowerCase();
  const tableRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  // UI data for year/month selectors
  const currentYear = new Date().getFullYear();
  const years = ["", ...Array.from({ length: 6 }, (_, i) => String(currentYear - i))];
  const months = [
    { v: "", n: "All" },
    { v: "01", n: "Jan" }, { v: "02", n: "Feb" }, { v: "03", n: "Mar" },
    { v: "04", n: "Apr" }, { v: "05", n: "May" }, { v: "06", n: "Jun" },
    { v: "07", n: "Jul" }, { v: "08", n: "Aug" }, { v: "09", n: "Sep" },
    { v: "10", n: "Oct" }, { v: "11", n: "Nov" }, { v: "12", n: "Dec" },
  ];

  return (
    <div className="space-y-6" style={{ color: FG }}>
      {/* Top bar with global Year/Month filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold">Admin Claims</h1>

        <div className="flex flex-wrap items-end gap-3" style={{ rowGap: "0.5rem" }}>
          <div className="flex flex-col">
            <label className="text-sm mb-1" style={{ color: `${FG}CC` }}>Year</label>
            <select
              value={year}
              onChange={(e)=>setYear(e.target.value)}
              className={CONTROL_CLS}
              style={CONTROL_STYLE}
            >
              {years.map((y, i) => <option key={i} value={y}>{y || "All"}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm mb-1" style={{ color: `${FG}CC` }}>Month</label>
            <select
              value={month}
              onChange={(e)=>setMonth(e.target.value)}
              className={CONTROL_CLS}
              style={CONTROL_STYLE}
            >
              {months.map((m) => <option key={m.v || "all"} value={m.v}>{m.n}</option>)}
            </select>
          </div>

          <div className="hidden sm:block w-2" />

          <button
            onClick={() => { fetchKpis(); fetchList(statusTab, page); toast("Refreshed", { type: "info", duration: 1500 }); }}
            className={`${CONTROL_CLS} cursor-pointer flex items-center justify-center whitespace-nowrap`}
            style={CONTROL_STYLE}
            title="Refresh data"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded border text-sm"
             style={{ background: "#fff1f2", color: "#b91c1c", borderColor: "#fecaca", borderWidth: 1 }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <Kpi label="Pending"  value={counts.pending} />
        <Kpi label="Approved" value={counts.approved} />
        <Kpi label="Rejected" value={counts.rejected} />
        <Kpi label="Recalled" value={counts.recalled} />
        {kpiSums.INR > 0 && <Kpi label="Total (INR)" value={formatCents(kpiSums.INR, "INR")} />}
        {kpiSums.MYR > 0 && <Kpi label="Total (MYR)" value={formatCents(kpiSums.MYR, "MYR")} />}
      </div>

      {/* Export & Filters */}
      <div className="flex flex-wrap items-end gap-3 p-3 border rounded-2xl"
           style={{ background: SURFACE, borderColor: BORDER, borderWidth: 1 }}>
        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: `${FG}CC` }}>From</label>
          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}
                 className="rounded px-2 py-1 border"
                 style={{ background: C_EGGSHELL, borderColor: BORDER, borderWidth: 1, color: FG }} />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: `${FG}CC` }}>To</label>
          <input type="date" value={to} onChange={(e)=>setTo(e.target.value)}
                 className="rounded px-2 py-1 border"
                 style={{ background: C_EGGSHELL, borderColor: BORDER, borderWidth: 1, color: FG }} />
        </div>

        <div className="flex flex-col min-w-[260px]">
          <label className="text-sm mb-1" style={{ color: `${FG}CC` }}>Email (optional)</label>
          <select value={email} onChange={(e)=>setEmail(e.target.value)}
                  className="rounded px-2 py-1 border"
                  style={{ background: C_EGGSHELL, borderColor: BORDER, borderWidth: 1, color: FG }}>
            <option value="">All users</option>
            {emailOptions.map((opt) => (
              <option key={opt.email} value={opt.email}>
                {opt.name ? `${opt.name} <${opt.email}>` : opt.email}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: `${FG}CC` }}>Status (optional)</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value)}
                  className="rounded px-2 py-1 border"
                  style={{ background: C_EGGSHELL, borderColor: BORDER, borderWidth: 1, color: FG }}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: `${FG}CC` }}>Format</label>
          <select value={format} onChange={(e)=>setFormat(e.target.value)}
                  className="rounded px-2 py-1 border"
                  style={{ background: C_EGGSHELL, borderColor: BORDER, borderWidth: 1, color: FG }}>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="pdf">PDF (.pdf)</option>
          </select>
        </div>

        <button onClick={runExport} className="px-4 py-2 rounded cursor-pointer" style={{ background: PRI, color: PRI_FG }}>
          Download
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden"
           style={{ background: SURFACE, borderColor: BORDER, borderWidth: 1 }}>
        <div className="px-4 py-3 border-b text-sm flex items-center justify-between gap-2"
             style={{ background: SURFACE, borderColor: BORDER, borderWidth: 1, color: FG }}>
          <div>
            {headerLabel} Claims (page {page} of {pageCount}) — total {total}
          </div>
          <div className="flex items-center gap-2">
            <span>View:</span>
            <select
              className="rounded px-2 py-1 border"
              style={{ background: C_EGGSHELL, borderColor: BORDER, borderWidth: 1, color: FG }}
              value={statusTab}
              onChange={(e) => onChangeStatusTab(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" style={{ color: FG }}>
            <thead>
              <tr style={{ background: SURFACE, color: FG }}>
                <th className="px-4 py-2 text-left">User Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Designation</th>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Status</th>
                {statusTab === "REJECTED" && (
                  <th className="px-4 py-2 text-left">Admin comment</th>
                )}
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: `${FG}99` }}>Loading…</td></tr>
              ) : tableRows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: `${FG}99` }}>No data</td></tr>
              ) : tableRows.map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="px-4 py-2">{displayUserName(c)}</td>
                  <td className="px-4 py-2" title={displayUserEmail(c)}>{displayUserEmail(c)}</td>
                  <td className="px-4 py-2">{displayDesignation(c)}</td>
                  <td className="px-4 py-2">{c.title}</td>
                  <td className="px-4 py-2">{formatCentsForClaim(c)}</td>
                  <td className="px-4 py-2">{c.status}</td>
                  {statusTab === "REJECTED" && (
                    <td className="px-4 py-2 max-w-[360px] truncate" style={{ color: "#b91c1c" }}
                        title={firstNonEmpty(c.adminComment, c.admin_comment) || ""}>
                      {firstNonEmpty(c.adminComment, c.admin_comment) || "—"}
                    </td>
                  )}
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-2">
                      {(c.status === "APPROVED" || c.status === "REJECTED") && (
                        <button
                          className="px-3 py-1 rounded border cursor-pointer"
                          style={{ background: C_EGGSHELL, borderColor: BORDER, color: FG }}
                          onClick={() => setRecallClaim(c)}
                          title="Recall this claim from the user"
                        >
                          Recall
                        </button>
                      )}
                      <button
                        className="px-3 py-1 rounded cursor-pointer"
                        style={{ background: PRI, color: PRI_FG }}
                        onClick={() => { setDetailClaim(c); setDetailOpen(true); }}
                        title="Open details & fullscreen preview"
                      >
                        Expand
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="px-4 py-3 border-t" style={{ background: SURFACE, borderColor: BORDER, borderWidth: 1 }}>
          <div className="flex items-center justify-between">
            <div />
            <div>
              <button
                className="px-3 py-1 rounded border mr-2 disabled:opacity-50 cursor-pointer"
                style={{ borderColor: BORDER, borderWidth: 1, background: SURFACE, color: FG }}
                onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchList(statusTab, p); }}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span className="text-sm">Page {page} / {pageCount}</span>
              <button
                className="px-3 py-1 rounded border ml-2 disabled:opacity-50 cursor-pointer"
                style={{ borderColor: BORDER, borderWidth: 1, background: SURFACE, color: FG }}
                onClick={() => { const p = Math.min(pageCount, page + 1); setPage(p); fetchList(statusTab, p); }}
                disabled={page >= pageCount}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      <DetailsModal
        open={detailOpen}
        claim={detailClaim}
        token={token}
        canAct={statusTab === "PENDING" || statusTab === "RECALLED"} // 👈 allow actions in recalled too
        onClose={() => { setDetailOpen(false); setDetailClaim(null); }}
        onApprove={doApprove}
        onReject={doReject}
      />


      {/* Recall modal */}
      <RecallDialog
        open={!!recallClaim}
        claim={recallClaim}
        onClose={() => setRecallClaim(null)}
        onDone={() => { fetchKpis(); fetchList(statusTab, page); }}
      />
    </div>
  );
}
