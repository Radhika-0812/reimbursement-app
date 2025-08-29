// src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { downloadToDisk } from "../services/download";
import { toast } from "../lib/toast";
import { centsFromClaim, formatCents } from "../lib/money";
import { C_NIGHT, C_CHAR, C_CLOUD, C_GUN, C_SLATE, C_STEEL } from "../theme/palette";

/** ─── Palette (swatch-aligned) ─── */
const C_OFFEE    = C_NIGHT;  // primary text
const C_COCOA    = C_GUN;    // primary action
const C_TAUPE    = C_CHAR;   // secondary action/accent
const C_LINEN    = C_SLATE;  // borders
const C_EGGSHELL = C_STEEL;  // inputs/light bg
const C_CARD     = C_CLOUD;  // cards
const C_CARD_HDR = "#E9DFD2"; // card headers (kept)

/** ---- Config ---- */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const ENDPOINTS = {
  pending:  "/api/admin/claims/pending",
  approved: "/api/admin/claims/approved",
  rejected: "/api/admin/claims/rejected",
  approveTpl: "/api/admin/claims/:id/approve",
  rejectTpl:  "/api/admin/claims/:id/reject",
  adminExport: "/api/admin/claims/export",
};
const AUTH_TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token";

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED"];
const STATUS_TO_ENDPOINT = {
  PENDING: ENDPOINTS.pending,
  APPROVED: ENDPOINTS.approved,
  REJECTED: ENDPOINTS.rejected,
};

/** ---- HTTP helper ---- */
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

/** ---------- Value helpers ---------- */
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
    c.userName, c.user_name,
    c.user?.name, c.user?.fullName, c.user?.username,
    c.name, c.fullName
  );
}
function displayUserEmail(c) {
  return firstNonEmpty(
    c.userEmail, c.user_email, c.email, c.user?.email, extractEmailDeep(c)
  );
}
function displayDesignation(c) {
  return firstNonEmpty(c.designation, c.userDesignation, c.user_designation, c.user?.designation);
}

/** ---- UI bits ---- */
function Kpi({ label, value }) {
  return (
    <div
      className="rounded-[1.25rem] border p-4"
      style={{ background: C_CARD, borderColor: C_LINEN }}
    >
      <div className="text-sm" style={{ color: `${C_OFFEE}B3` }}>{label}</div>
      <div className="text-2xl font-semibold mt-1" style={{ color: C_OFFEE }}>{value}</div>
    </div>
  );
}

/** Small, toast-like confirmation panel */
function ConfirmToast({ open, kind, comment, onConfirm, onCancel }) {
  if (!open) return null;
  const title = kind === "approve" ? "Approve this claim?" : "Reject this claim?";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      <div
        className="max-w-sm w-[360px] border rounded-xl p-4 pointer-events-auto shadow-2xl"
        style={{ background: C_CARD, borderColor: C_LINEN, color: C_OFFEE }}
      >
        <div className="font-medium text-base">{title}</div>
        {kind === "reject" && comment && (
          <div className="mt-1 text-xs" style={{ color: `${C_OFFEE}99` }}>
            Reason: <span style={{ color: C_OFFEE }}>{comment}</span>
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded border text-sm"
            style={{ borderColor: C_LINEN, background: C_EGGSHELL, color: C_OFFEE }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded text-sm"
            style={{
              background: kind === "approve" ? C_COCOA : C_TAUPE,
              color: C_EGGSHELL,
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/** Details modal with inline preview + toaster confirmations */
function DetailsModal({ open, claim, onClose, onApprove, onReject, token, canAct }) {
  const [preview, setPreview] = useState({ url: "", contentType: "", filename: "", has: false, supported: false });
  const [rejectComment, setRejectComment] = useState("");
  const [rejectNeedsComment, setRejectNeedsComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, kind: null });
  const firstBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setRejectComment("");
    setRejectNeedsComment(false);
    setSubmitting(false);
    setConfirm({ open: false, kind: null });
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

  const amountCents = formatCents(centsFromClaim(claim));
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div
        className="w-full max-w-4xl rounded-2xl border shadow-xl overflow-hidden"
        style={{ background: C_CARD, borderColor: C_LINEN, color: C_OFFEE }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: C_LINEN, background: C_GUN , color:"white" }}
        >
          <div className="text-lg font-semibold">Claim Details</div>
          <button
            className="px-3 py-1 rounded border"
            style={{ borderColor: C_LINEN, background: C_EGGSHELL, color: C_OFFEE }}
            onClick={onClose}
            ref={firstBtnRef}
          >
            Close
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <div><span className="text-xs" style={{ color: `${C_OFFEE}99` }}>User</span><div className="font-medium">{displayUserName(claim)}</div></div>
            <div><span className="text-xs" style={{ color: `${C_OFFEE}99` }}>Email</span><div className="font-medium">{displayUserEmail(claim)}</div></div>
            <div><span className="text-xs" style={{ color: `${C_OFFEE}99` }}>Designation</span><div className="font-medium">{displayDesignation(claim)}</div></div>
            <div><span className="text-xs" style={{ color: `${C_OFFEE}99` }}>Title</span><div className="font-medium">{claim.title || "—"}</div></div>
            <div><span className="text-xs" style={{ color: `${C_OFFEE}99` }}>Type</span><div className="font-medium">{claim.claimType || "—"}</div></div>
            <div><span className="text-xs" style={{ color: `${C_OFFEE}99` }}>Amount (cents)</span><div className="font-medium">{amountCents}</div></div>
            <div><span className="text-xs" style={{ color: `${C_OFFEE}99` }}>Submitted</span><div className="font-medium">{submittedAt}</div></div>
            {claim.description && (
              <div>
                <span className="text-xs" style={{ color: `${C_OFFEE}99` }}>Claim description</span>
                <div className="whitespace-pre-wrap text-sm">{claim.description}</div>
              </div>
            )}
            {isRejected && adminComment !== "—" && (
              <div>
                <span className="text-xs" style={{ color: `${C_OFFEE}99` }}>Admin comment</span>
                <div className="whitespace-pre-wrap text-sm" style={{ color: "#b91c1c" }}>{adminComment}</div>
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div
              className="px-3 py-2 text-sm border-b"
              style={{ borderColor: C_LINEN, background: C_GUN ,color: "white" }}
            >
              Receipt
            </div>
            <div
              className="p-3 min-h-64 flex items-center justify-center"
              style={{ background: C_EGGSHELL }}
            >
              {!preview.has && <div className="text-sm" style={{ color: `${C_OFFEE}99` }}>No receipt uploaded.</div>}
              {preview.has && preview.supported && (
                preview.contentType.includes("pdf")
                  ? <iframe title="Receipt PDF" src={preview.url} className="w-full h-96 border-0" />
                  : <img src={preview.url} alt="Receipt" className="max-h-96 object-contain" />
              )}
              {preview.has && !preview.supported && (
                <div className="text-center">
                  <div className="text-sm mb-3" style={{ color: `${C_OFFEE}99` }}>
                    Preview not supported for this file type
                    <span className="block text-xs mt-1">({preview.contentType || "unknown"})</span>
                  </div>
                  <button
                    onClick={downloadUnsupported}
                    className="px-3 py-2 rounded"
                    style={{ background: C_COCOA, color: C_EGGSHELL }}
                  >
                    Download file
                  </button>
                </div>
              )}
            </div>
            <div
              className="px-3 py-2 text-xs border-t"
              style={{ color: `${C_OFFEE}99`, borderColor: C_LINEN, background: C_CARD }}
            >
              {preview.supported ? "View-only preview is shown; downloading is not offered here."
                                 : "Preview unavailable. A download option is provided."}
            </div>
          </div>
        </div>

        {canAct ? (
          <div
            className="px-5 py-4 border-t flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: C_LINEN, background: C_CARD }}
          >
            <div className="flex-1">
              <label className="text-sm" style={{ color: `${C_OFFEE}CC` }}>Reject reason (required to reject)</label>
              <textarea
                rows={2}
                value={rejectComment}
                onChange={(e) => { setRejectComment(e.target.value); if (rejectNeedsComment && e.target.value.trim()) setRejectNeedsComment(false); }}
                className="w-full mt-1 p-2 rounded border"
                style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
                placeholder="Explain why this claim is rejected"
              />
              {rejectNeedsComment && !rejectComment.trim() && (
                <div className="text-xs mt-1" style={{ color: "#b91c1c" }}>Comment is required to reject.</div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded border"
                style={{ borderColor: C_LINEN, background: C_EGGSHELL, color: C_OFFEE }}
                onClick={onClose}
                disabled={submitting}
              >
                Close
              </button>
              <button
                className="px-4 py-2 rounded text-white disabled:opacity-50"
                style={{ background: C_COCOA }}
                onClick={() => setConfirm({ open: true, kind: "approve" })}
                disabled={submitting}
              >
                Approve
              </button>
              <button
                className="px-4 py-2 rounded text-white disabled:opacity-50"
                style={{ background: C_TAUPE }}
                onClick={() => {
                  const comment = (rejectComment || "").trim();
                  if (!comment) { setRejectNeedsComment(true); toast("Need comments", { type: "warning" }); return; }
                  setConfirm({ open: true, kind: "reject" });
                }}
                disabled={submitting}
              >
                Reject
              </button>
            </div>
          </div>
        ) : (
          <div
            className="px-5 py-4 border-t flex justify-end"
            style={{ borderColor: C_LINEN, background: C_CARD }}
          >
            <button
              className="px-4 py-2 rounded border"
              style={{ borderColor: C_LINEN, background: C_EGGSHELL, color: C_OFFEE }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Toast-style confirm (centered) */}
      <ConfirmToast
        open={confirm.open}
        kind={confirm.kind}
        comment={(rejectComment || "").trim()}
        onCancel={() => setConfirm({ open: false, kind: null })}
        onConfirm={confirm.kind === "approve" ? confirmAndApprove : confirmAndReject}
      />
    </div>
  );
}

export default function AdminDashboard() {
  const token = getAuth();
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Table state
  const [statusTab, setStatusTab] = useState("PENDING");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);

  // Details modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClaim, setDetailClaim] = useState(null);

  // Export panel
  const today = new Date().toISOString().slice(0,10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState("");
  const [format, setFormat] = useState("xlsx");

  const buildUrl = (tpl, id) => tpl.replace(":id", String(id));

  async function fetchCounts() {
    const [approvedPage, rejectedPage, pendingPage] = await Promise.all([
      http("GET", `${ENDPOINTS.approved}?page=0&size=1`, { token }),
      http("GET", `${ENDPOINTS.rejected}?page=0&size=1`, { token }),
      http("GET", `${ENDPOINTS.pending}?page=0&size=1`, { token }),
    ]);
    const totalOf = (x) => x?.totalElements ?? x?.page?.totalElements ?? (Array.isArray(x) ? x.length : 0);
    setCounts({
      approved: totalOf(approvedPage),
      rejected: totalOf(rejectedPage),
      pending:  totalOf(pendingPage),
    });
  }

  async function fetchList(currentStatus = statusTab, currentPage = 1) {
    const endpoint = STATUS_TO_ENDPOINT[currentStatus] || ENDPOINTS.pending;
    const data = await http("GET", `${endpoint}?page=${currentPage - 1}&size=10`, { token });
    const content = Array.isArray(data) ? data : (data?.content ?? []);
    setRows(content);
    setPageCount(data?.totalPages ?? 1);
    setTotal(data?.totalElements ?? content.length);
    if (content.length > 0 && currentPage === 1) console.log(`[admin] sample row (${currentStatus}) →`, content[0]);
  }

  useEffect(() => {
    (async () => {
      try {
        if (!token) { setError("Not authenticated. Please sign in as an admin."); toast("Admin auth required", { type: "error" }); return; }
        await fetchCounts();
        await fetchList("PENDING", 1);
      } catch (e) {
        setError(e.message || String(e));
        toast(e.message || "Failed to load", { type: "error" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onChangeStatusTab(next) {
    setStatusTab(next);
    setPage(1);
    setLoading(true);
    try { await fetchList(next, 1); }
    catch (e) { setError(e.message || String(e)); toast(e.message || "Failed to load", { type: "error" }); }
    finally { setLoading(false); }
  }

  async function doApprove(claim) {
    try {
      await http("PATCH", buildUrl(ENDPOINTS.approveTpl, claim.id), { token });
      await Promise.all([fetchCounts(), fetchList(statusTab, page)]);
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
      await Promise.all([fetchCounts(), fetchList(statusTab, page)]);
      toast("Rejected successfully", { type: "success" });
      setDetailOpen(false); setDetailClaim(null);
    } catch (e) {
      setError(e.message || String(e));
      toast(e.responseText || e.message || "Reject failed", { type: "error" });
    }
  }

  async function runExport() {
    try {
      const qs = new URLSearchParams({ from, to, format, ...(status ? { status } : {}) }).toString();
      const name = `claims_${from}_to_${to}${status ? `_${status.toLowerCase()}` : ""}.${format}`;
      await downloadToDisk(`${ENDPOINTS.adminExport}?${qs}`, name);
      toast("Download started", { type: "success" });
    } catch (e) {
      setError(e.message || String(e));
      toast(e.message || "Download failed", { type: "error" });
    }
  }

  const tableRows = useMemo(() => Array.isArray(rows) ? rows : [], [rows]);
  const headerLabel = statusTab[0] + statusTab.slice(1).toLowerCase();

  // Column count for placeholders — base columns + Admin comment (only on Rejected)
  // Base: User, Email, Designation, Title, Amount, Status, Actions
  const COLS = 7 + (statusTab === "REJECTED" ? 1 : 0);

  return (
    // Keep wrapper simple so AppShell controls padding; align parallel to sidebar
    <div className="space-y-6" style={{ color: C_OFFEE }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Claims</h1>
        <button
          onClick={() => { fetchCounts(); fetchList(statusTab, page); toast("Refreshed", { type: "info", duration: 1500 }); }}
          className="px-3 py-2 rounded border"
          style={{ borderColor: C_LINEN, background: C_EGGSHELL, color: C_OFFEE }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="p-3 rounded border text-sm"
          style={{ background: "#fff1f2", color: "#b91c1c", borderColor: "#fecaca" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi label="Pending"  value={counts.pending} />
        <Kpi label="Approved" value={counts.approved} />
        <Kpi label="Rejected" value={counts.rejected} />
      </div>

      {/* Export Panel */}
      <div
        className="flex flex-wrap items-end gap-3 p-3 border rounded-2xl"
        style={{ background: C_CARD, borderColor: C_LINEN }}
      >
        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: `${C_OFFEE}CC` }}>From</label>
          <input
            type="date"
            value={from}
            onChange={(e)=>setFrom(e.target.value)}
            className="rounded px-2 py-1 border"
            style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: `${C_OFFEE}CC` }}>To</label>
          <input
            type="date"
            value={to}
            onChange={(e)=>setTo(e.target.value)}
            className="rounded px-2 py-1 border"
            style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: `${C_OFFEE}CC` }}>Status (optional)</label>
          <select
            value={status}
            onChange={(e)=>setStatus(e.target.value)}
            className="rounded px-2 py-1 border"
            style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1" style={{ color: `${C_OFFEE}CC` }}>Format</label>
          <select
            value={format}
            onChange={(e)=>setFormat(e.target.value)}
            className="rounded px-2 py-1 border"
            style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="pdf">PDF (.pdf)</option>
          </select>
        </div>
        <button
          onClick={runExport}
          className="px-4 py-2 rounded text-white"
          style={{ background: C_COCOA }}
        >
          Download
        </button>
      </div>

      {/* Unified table with status dropdown */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: C_CARD, borderColor: C_LINEN }}
      >
        <div
          className="px-4 py-3 border-b text-sm flex items-center justify-between gap-2"
          style={{ background: C_GUN, borderColor: C_LINEN, color: "white" }}
        >
          <div>
            {headerLabel} Claims (page {page} of {pageCount}) — total {total}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: "white" }}>View:</span>
            <select
              className="rounded px-2 py-1 border"
              style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
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
          <table className="min-w-full text-sm" style={{ color: "white" }}>
            <thead>
              <tr style={{ background: C_GUN, color: "white" }}>
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
                <tr><td colSpan={COLS} className="px-4 py-8 text-center" style={{ color: `${C_OFFEE}99` }}>Loading…</td></tr>
              ) : tableRows.length === 0 ? (
                <tr><td colSpan={COLS} className="px-4 py-8 text-center" style={{ color: `${C_OFFEE}99` }}>No data</td></tr>
              ) : tableRows.map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: C_LINEN  , color:C_GUN}}>
                  <td className="px-4 py-2">{displayUserName(c)}</td>
                  <td className="px-4 py-2" title={displayUserEmail(c)}>{displayUserEmail(c)}</td>
                  <td className="px-4 py-2">{displayDesignation(c)}</td>
                  <td className="px-4 py-2">{c.title}</td>
                  <td className="px-4 py-2">{formatCents(centsFromClaim(c))}</td>
                  <td className="px-4 py-2">{c.status}</td>

                  {statusTab === "REJECTED" && (
                    <td
                      className="px-4 py-2 max-w-[360px] truncate"
                      style={{ color: "#b91c1c" }}
                      title={firstNonEmpty(c.adminComment, c.admin_comment) || ""}
                    >
                      {firstNonEmpty(c.adminComment, c.admin_comment) || "—"}
                    </td>
                  )}

                  <td className="px-4 py-2 text-right">
                    <button
                      className="px-3 py-1 rounded"
                      style={{ background: C_GUN, color: C_EGGSHELL }}
                      onClick={() => { setDetailClaim(c); setDetailOpen(true); }}
                    >
                      View more
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="px-4 py-3 border-t"
          style={{ background: C_GUN, borderColor: C_LINEN , color:"white"}}
        >
          <div className="flex items-center justify-between">
            <div />
            <div>
              <button
                className="px-3 py-1 rounded border mr-2 disabled:opacity-50"
                style={{ borderColor: C_LINEN, background: C_GUN, color: "white" }}
                onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchList(statusTab, p); }}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span className="text-sm" style={{ color: "white" }}>
                Page {page} / {pageCount}
              </span>
              <button
                className="px-3 py-1 rounded border ml-2 disabled:opacity-50"
                style={{ borderColor: C_LINEN, background: C_EGGSHELL, color: "white" }}
                onClick={() => { const p = Math.min(pageCount, page + 1); setPage(p); fetchList(statusTab, p); }}
                disabled={page >= pageCount}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <DetailsModal
        open={detailOpen}
        claim={detailClaim}
        token={token}
        canAct={statusTab === "PENDING"}
        onClose={() => { setDetailOpen(false); setDetailClaim(null); }}
        onApprove={doApprove}
        onReject={doReject}
      />
    </div>
  );
}
