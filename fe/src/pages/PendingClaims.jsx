// src/pages/PendingClaims.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useClaims } from "../state/ClaimsContext";
import { on } from "../lib/eventBus";
import { toast } from "../lib/toast";
import { useAuth } from "../state/AuthContext";
import { centsFromClaim, formatCents, currencyOfClaim } from "../lib/money"; // 👈 added currencyOfClaim
import { useDateFilter } from "../state/DateFilterContext";
import { MONTH_LABELS, getDateFromClaim, inYearMonth } from "../lib/dates";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const AUTH_TOKEN_KEYS = [
  import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token",
  "access_token",
  "token",
];

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
    const m = /filename\s*=\s*\"?([^\";]+)\"?/i.exec(contentDisposition);
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
  const buf = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) return "image/gif";
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "image/bmp";
  // 👇 fixed: 0x46 ('F') not 0x03
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  return "";
}
// 👇 format using the claim's currency (₹ for INR, RM for MYR)
const displayAmount = (claim) => formatCents(centsFromClaim(claim), currencyOfClaim(claim));
const formatDate = (ts) => { try { return new Date(ts).toLocaleString(); } catch { return ts || ""; } };

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

  const baseBtn = { borderColor: "var(--border)", color: "var(--foreground)", background: "var(--sidebar-accent)" };

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
                  style={n === page ? { background: "var(--primary)", color: "var(--primary-foreground)", borderColor: "var(--primary)" } : baseBtn}>
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

const PAGE_SIZE = 4;

export default function PendingClaims() {
  const { pending: pendingRaw = [], loading, refresh } = useClaims();
  const auth = useAuth();
  const { year, month, setYear, setMonth } = useDateFilter();

  const [page, setPage] = useState(1);
  const [openingId, setOpeningId] = useState(null);
  const [hasReceiptMap, setHasReceiptMap] = useState({});
  const [preview, setPreview] = useState({ open: false, url: "", contentType: "", filename: "", supported: false, claimId: null });

  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    refresh?.().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    const off = on("claims:changed", () => { toast("Claims updated", { type: "info" }); refresh?.(); });
    return off;
  }, [refresh]);

  const availableYears = useMemo(() => {
    const ds = pendingRaw.map(getDateFromClaim).filter(Boolean);
    if (!ds.length) return [new Date().getFullYear()];
    const min = ds.reduce((a, d) => Math.min(a, d.getFullYear()), ds[0].getFullYear());
    const max = ds.reduce((a, d) => Math.max(a, d.getFullYear()), ds[0].getFullYear());
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [pendingRaw]);

  const filtered = useMemo(() => (pendingRaw || []).filter(inYearMonth(year, month)), [pendingRaw, year, month]);

  const total = filtered.length;
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > pageCount) setPage(1);
  }, [total, page]);

  async function authHeaders() {
    if (auth?.getAccessToken) {
      try { const t = await auth.getAccessToken(); if (t) return { Authorization: `Bearer ${t}` }; } catch {}
    }
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    (async () => {
      const headers = await authHeaders();
      const idsToCheck = pageItems
        .map((c) => c.id ?? c.claimId)
        .filter((id, i) => {
          const c = pageItems[i];
          const hasMeta =
            c.hasReceipt === true ||
            (typeof c.receiptSize === "number" && c.receiptSize > 0) ||
            !!c.receiptFilename;
          return !hasMeta && hasReceiptMap[id] === undefined;
        });
      if (idsToCheck.length === 0) return;
      for (const id of idsToCheck) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/claims/${id}/receipt`, { method: "HEAD", headers, credentials: "include" });
          setHasReceiptMap((m) => ({ ...m, [id]: res.ok }));
        } catch {
          setHasReceiptMap((m) => ({ ...m, [id]: false }));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageItems]);

  function hasReceiptFor(c) {
    const id = c.id ?? c.claimId;
    if (c.hasReceipt === true) return true;
    if (typeof c.receiptSize === "number" && c.receiptSize > 0) return true;
    if (c.receiptFilename) return true;
    return hasReceiptMap[id] === true;
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
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE_URL}/api/claims/${claimId}/receipt`, { method: "GET", headers, credentials: "include" });
      if (res.status === 404) { setHasReceiptMap((m) => ({ ...m, [claimId]: false })); toast("No receipt uploaded for this claim", { type: "warning" }); return; }
      if (!res.ok) { const text = await res.text().catch(() => ""); throw new Error(text || "Failed to fetch receipt"); }

      let ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.startsWith("text/html")) { toast("Receipt endpoint returned HTML (auth/proxy/base URL issue)", { type: "error" }); return; }

      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const fallbackName = `receipt-${claimId}`;
      let filename = extractFilename(cd, fallbackName);

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
      toast(e.message || "Could not open receipt", { type: "error" });
    } finally { setOpeningId(null); }
  }

  return (
    <div className="space-y-6" style={{ color: "var(--foreground)", background: "var(--background)" }}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Pending Claims</h1>

        <div className="flex items-center gap-3">
          <div className="rounded-[1rem] border px-3 py-2" style={{ background: "var(--background)", borderColor: "var(--border)", borderWidth: 1 }}>
            <label className="text-xs mr-2" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>Year</label>
            <select className="bg-transparent text-sm outline-none" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="rounded-[1rem] border px-3 py-2" style={{ background: "var(--background)", borderColor: "var(--foreground)", borderWidth: 1 }}>
            <label className="text-xs mr-2" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>Month</label>
            <select className="bg-transparent text-sm outline-none" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="ALL">All</option>
              {MONTH_LABELS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <p style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Loading…</p>}
      {!loading && total === 0 && <p style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>No pending claims for this window.</p>}

      {!!total && (
        <>
          <div className="grid gap-3">
            {pageItems.map((c) => {
              const id = c.id ?? c.claimId;
              const canView = hasReceiptFor(c);
              const createdTs = c.createdAt || c.updatedAt;
              const code = currencyOfClaim(c); // 👈 INR or MYR

              return (
                <div key={id} className="rounded-xl border overflow-hidden"
                     style={{ borderColor: "var(--border)", borderWidth: 1, background: "var(--background)" }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b"
                       style={{ borderColor: "var(--border)", borderWidth: 0, background: "var(--sidebar)", color: "BLACK" }}>
                    <div className="min-w-0">
                      <div className="text-xs opacity-70 truncate">Claim #{id}</div>
                      <div className="font-medium capitalize truncate">{c.title ?? c.category ?? "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canView && (
                        <button onClick={() => viewReceipt(id)}
                                className="text-sm px-3 py-1.5 rounded-md disabled:opacity-60"
                                style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: openingId === id ? 0.7 : 1 }}
                                disabled={openingId === id} title="Expand">
                          {openingId === id ? "Opening…" : "View Receipt"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-3 grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Status</div>
                      <div className="font-medium">PENDING</div>
                    </div>
                    <div>
                      <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Created</div>
                      <div className="font-medium">{formatDate(createdTs)}</div>
                    </div>
                    <div>
                      <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Amount</div>
                      {/* 👇 shows ₹ or RM, and the code tag */}
                      <div className="font-medium">
                        {displayAmount(c)} <span className="opacity-70 text-[11px]">({code})</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Type</div>
                      <div className="font-medium">{c.claimType || "—"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <LocalPagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </>
      )}

      {/* Fullscreen receipt viewer (Admin-style) */}
      <FullscreenPreview open={preview.open} preview={preview} onClose={() => {
        if (preview.url) URL.revokeObjectURL(preview.url);
        setPreview({ open:false, url:"", contentType:"", filename:"", supported:false, claimId:null });
      }} />
    </div>
  );
}
