// src/pages/ClosedClaims.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useClaims } from "../state/ClaimsContext";
import { useAuth } from "../state/AuthContext";
import { toast } from "../lib/toast";
import { centsFromClaim, formatCents, currencyOfClaim } from "../lib/money";
import { useDateFilter } from "../state/DateFilterContext";
import { MONTH_LABELS, getDateFromClaim, inYearMonth } from "../lib/dates";
import RecallRespondDialog from "../components/RecallRespondDialog"; // 👈 user recall dialog

// ---------- Config ----------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const AUTH_TOKEN_KEYS = [
  import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token",
  "access_token",
  "token",
];

// ---------- Helpers ----------
function getStoredToken() {
  for (const k of AUTH_TOKEN_KEYS) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  return null;
}
function extractFilename(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  try {
    const mStar = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition);
    if (mStar) return decodeURIComponent(mStar[1]);
    const m = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
    if (m) return decodeURIComponent(m[1]);
  } catch {}
  return fallback;
}
function extFromFilename(name = "") {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.substring(i + 1).toLowerCase();
}
const isPdfCT = (ct = "") => ct.includes("application/pdf");
const isImgCT = (ct = "") => ct.startsWith("image/");
async function sniffMime(blob) {
  const b = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf";
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return "image/gif";
  if (b[0] === 0x42 && b[1] === 0x4d) return "image/bmp";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return "";
}
// 👇 Use claim’s currency:
const displayAmount = (c) => formatCents(centsFromClaim(c), currencyOfClaim(c));

/* ---- Recall helpers (tolerant to API shapes) ---- */
const hasRecall = (c) =>
  c?.recallStatus === "REQUESTED" || c?.recallRequested === true || c?.needsMoreInfo === true;
const recallReason = (c) => c?.recallReason || c?.recallComment || c?.recall_comment || "Additional information required.";
const recallRequireAttachment = (c) => !!(c?.recallRequireAttachment || c?.recall_attachment_required);

/* ---- Fullscreen viewer ---- */
function FullscreenPreview({ open, preview, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center" onClick={onClose}>
      <button
        aria-label="Close"
        className="absolute top-4 right-4 px-3 py-2 rounded"
        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        ✕
      </button>
      <div className="max-w-[95vw] max-h-[92vh] w-full h-full p-2 flex items-center justify-center" onClick={(e)=>e.stopPropagation()}>
        {preview?.supported ? (
          preview.contentType.includes("pdf")
            ? <iframe title="Receipt PDF" src={preview.url} className="w-full h-full border-0 rounded-lg" />
            : <img src={preview.url} alt="Receipt" className="max-w-full max-h-full rounded-lg object-contain" />
        ) : (
          <div className="text-white">Preview not available</div>
        )}
      </div>
    </div>
  );
}

/** Local pagination (theme’d) */
function LocalPagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(pages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const seq = [];
  if (start > 1) { seq.push(1); if (start > 2) seq.push("…"); }
  for (let p = start; p <= end; p++) seq.push(p);
  if (end < pages) { if (end < pages - 1) seq.push("…"); seq.push(pages); }

  const baseBtn = {
    borderColor: "var(--border)",
    color: "var(--foreground)",
    background: "var(--sidebar-accent)",
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}
              className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-60" style={baseBtn}>
        Prev
      </button>

      {seq.map((n, i) =>
        n === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>…</span>
        ) : (
          <button key={n} onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined}
                  className="px-3 py-1.5 rounded-md border text-sm"
                  style={n === page
                    ? { background: "var(--primary)", color: "var(--primary-foreground)", borderColor: "var(--border)" }
                    : baseBtn}>
            {n}
          </button>
        )
      )}

      <button onClick={() => onPage(Math.min(pages, page + 1))} disabled={page >= pages}
              className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-60" style={baseBtn}>
        Next
      </button>
    </div>
  );
}

const PAGE_SIZE = 5;

export default function ClosedClaims() {
  const { closed: closedRaw = [], loading, refresh } = useClaims();
  const auth = useAuth();
  const { year, month, setYear, setMonth } = useDateFilter();

  const [page, setPage] = useState(1);
  const [openingId, setOpeningId] = useState(null);
  const [preview, setPreview] = useState({ open: false, url: "", contentType: "", filename: "", supported: false, claimId: null });
  const [recallFor, setRecallFor] = useState(null); // 👈 respond modal

  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    refresh?.().catch(() => {});
  }, [refresh]);

  useEffect(() => () => { if (preview.url) URL.revokeObjectURL(preview.url); }, [preview.url]);

  const availableYears = useMemo(() => {
    const ds = closedRaw.map(getDateFromClaim).filter(Boolean);
    if (!ds.length) return [new Date().getFullYear()];
    const min = ds.reduce((a, d) => Math.min(a, d.getFullYear()), ds[0].getFullYear());
    const max = ds.reduce((a, d) => Math.max(a, d.getFullYear()), ds[0].getFullYear());
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [closedRaw]);

  const closed = useMemo(() => (closedRaw || []).filter(inYearMonth(year, month)), [closedRaw, year, month]);

  const total = closed.length;
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return closed.slice(start, start + PAGE_SIZE);
  }, [closed, page]);

  async function authHeader() {
    if (auth?.getAccessToken) {
      try { const t = await auth.getAccessToken(); if (t) return { Authorization: `Bearer ${t}` }; } catch {}
    }
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function downloadBlob(blob, filename = "file") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function viewReceipt(claimId) {
    setOpeningId(claimId);
    try {
      const headers = await authHeader();
      const res = await fetch(`${API_BASE_URL}/api/claims/${claimId}/receipt`, { method: "GET", headers, credentials: "include" });

      if (res.status === 404) { toast?.("No receipt uploaded for this claim", { type: "warning" }); return; }

      const ctRaw = (res.headers.get("content-type") || "").toLowerCase();
      if (ctRaw.startsWith("text/html")) { toast?.("Receipt endpoint returned HTML (likely auth/proxy issue)", { type: "error" }); return; }

      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const filename = extractFilename(cd, `receipt-${claimId}`);
      let ct = ctRaw || "";

      const ext = extFromFilename(filename);
      if (!ct || ct === "application/octet-stream") {
        if (ext === "pdf") ct = "application/pdf";
        if (["png","jpg","jpeg","gif","webp","bmp","svg"].includes(ext))
          ct = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      }
      if (!ct || ct === "application/octet-stream") {
        const sniffed = await sniffMime(blob);
        if (sniffed) ct = sniffed;
      }

      const supported = isPdfCT(ct) || isImgCT(ct);
      if (!supported) { downloadBlob(blob, filename); return; }

      const url = URL.createObjectURL(blob);
      setPreview({ open: true, url, contentType: ct, filename, supported: true, claimId });
    } catch (e) {
      console.error(e);
      toast?.(e?.message || "Could not open receipt", { type: "error" });
    } finally { setOpeningId(null); }
  }

  const isFullyApproved = (c) =>
    String(c.status).toUpperCase() === "APPROVED" ||
    String(c.status).toUpperCase() === "FULLY_APPROVED";

  /** APPROVED Card */
  const ApprovedCard = ({ c }) => {
    const id = c.id ?? c.claimId;
    const closedTs = c.closedAt || c.updatedAt || c.createdAt;
    const code = currencyOfClaim(c);

    return (
      <div className="rounded-xl border overflow-hidden w-full"
           style={{ borderColor: "var(--border)", borderWidth: 1, background: "var(--background)", color: "var(--foreground)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b"
             style={{ borderColor: "var(--border)", borderWidth: 0, background: "var(--sidebar)", color: "black" }}>
          <div className="min-w-0">
            <div className="text-xs opacity-70 truncate">Claim #{id}</div>
            <div className="font-medium truncate" style={{ color: "var(--chart-1)" }}>
              {String(c.status).toUpperCase()}
            </div>
          </div>
          {c.hasReceipt === true && (
            <button
              onClick={() => viewReceipt(id)}
              className="text-sm px-3 py-1.5 rounded-md"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              title="Expand"
            >
              View Receipt
            </button>
          )}
        </div>

        <div className="px-4 py-3 grid sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Type</div>
            <div className="font-medium">{c.claimType || "—"}</div>
          </div>
          <div>
            <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Closed</div>
            <div className="font-medium">{new Date(closedTs).toLocaleString?.() || String(closedTs || "")}</div>
          </div>
          <div>
            <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Amount</div>
            <div className="font-semibold">{displayAmount(c)} <span className="opacity-70 text-[11px]">({code})</span></div>
          </div>

          {/* Recall banner if requested */}
          {hasRecall(c) && (
            <div className="sm:col-span-3 rounded-md border px-3 py-2 mt-1"
                 style={{ borderColor: "var(--border)", background: "var(--accent)" }}>
              <div className="text-sm font-semibold">Recall requested by Admin</div>
              <div className="text-xs mt-1" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>
                {recallReason(c)}{recallRequireAttachment(c) ? " (Attachment required)" : ""}
              </div>
              <div className="mt-2">
                <button
                  onClick={() => setRecallFor(c)}
                  className="text-sm px-3 py-1.5 rounded-md"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  Respond
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /** REJECTED / OTHER Card */
  const RejectedOrOtherCard = ({ c }) => {
    const id = c.id ?? c.claimId;
    const closedTs = c.closedAt || c.updatedAt || c.createdAt;
    const code = currencyOfClaim(c);

    return (
      <div className="rounded-xl border overflow-hidden w-full"
           style={{ borderColor: "var(--border)", borderWidth: 1, background: "var(--background)", color: "var(--foreground)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b"
             style={{ borderColor: "var(--border)", borderWidth: 0, background: "var(--sidebar)", color: "BLACK" }}>
          <div className="min-w-0">
            <div className="text-xs opacity-70 truncate">Claim #{id}</div>
            <div className="font-medium capitalize truncate">{c.title ?? c.category ?? "—"}</div>
          </div>
          {c.hasReceipt === true && (
            <button
              onClick={() => viewReceipt(id)}
              className="text-sm px-3 py-1.5 rounded-md"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              title="Expand"
            >
              View Receipt
            </button>
          )}
        </div>

        <div className="px-4 py-3 grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Status</div>
            <div className="font-medium" style={{ color: String(c.status).toUpperCase() === "REJECTED" ? "var(--destructive)" : "inherit" }}>
              {c.status ?? "—"}
            </div>
          </div>
          <div>
            <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Closed</div>
            <div className="font-medium">{new Date(closedTs).toLocaleString?.() || String(closedTs || "")}</div>
          </div>
          <div>
            <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Amount</div>
            <div className="font-medium">{displayAmount(c)} <span className="opacity-70 text-[11px]">({code})</span></div>
          </div>
          <div>
            <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Type</div>
            <div className="font-medium">{c.claimType || "—"}</div>
          </div>

          {String(c.status).toUpperCase() === "REJECTED" && (
            <div className="sm:col-span-2">
              <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Reject Reason</div>
              <div className="font-medium" style={{ color: "var(--destructive)" }}>
                {c.adminComment || "—"}
              </div>
            </div>
          )}

          {/* Recall banner if requested */}
          {hasRecall(c) && (
            <div className="sm:col-span-2 rounded-md border px-3 py-2"
                 style={{ borderColor: "var(--border)", background: "var(--accent)" }}>
              <div className="text-sm font-semibold">Recall requested by Admin</div>
              <div className="text-xs mt-1" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>
                {recallReason(c)}{recallRequireAttachment(c) ? " (Attachment required)" : ""}
              </div>
              <div className="mt-2">
                <button
                  onClick={() => setRecallFor(c)}
                  className="text-sm px-3 py-1.5 rounded-md"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  Respond
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" style={{ color: "var(--foreground)" }}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Closed Claims</h1>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="rounded-[1rem] border px-3 py-2"
               style={{ background: "var(--background)", borderColor: "var(--border)", borderWidth: 0 }}>
            <label className="text-xs mr-2" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>Year</label>
            <select className="bg-transparent text-sm outline-none" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="rounded-[1rem] border px-3 py-2"
               style={{ background: "var(--background)", borderColor: "var(--border)", borderWidth: 0 }}>
            <label className="text-xs mr-2" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>Month</label>
            <select className="bg-transparent text-sm outline-none" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="ALL">All</option>
              {MONTH_LABELS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <p style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Loading…</p>}
      {!loading && total === 0 && <p style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>No closed claims for this window.</p>}

      {!!total && (
        <>
          <div className="grid gap-3">
            {pageItems.map((c) =>
              isFullyApproved(c) ? (
                <ApprovedCard key={c.id ?? c.claimId} c={c} />
              ) : (
                <RejectedOrOtherCard key={c.id ?? c.claimId} c={c} />
              )
            )}
          </div>

          <LocalPagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </>
      )}

      {/* Fullscreen receipt viewer */}
      <FullscreenPreview open={preview.open} preview={preview} onClose={() => {
        if (preview.url) URL.revokeObjectURL(preview.url);
        setPreview({ open:false, url:"", contentType:"", filename:"", supported:false, claimId:null });
      }} />

      {/* Recall respond modal */}
      <RecallRespondDialog
        open={!!recallFor}
        claim={recallFor}
        requireAttachment={recallRequireAttachment(recallFor || {})}
        onClose={() => setRecallFor(null)}
        onDone={() => { toast("Response sent", { type: "success" }); setRecallFor(null); refresh?.(); }}
      />
    </div>
  );
}
