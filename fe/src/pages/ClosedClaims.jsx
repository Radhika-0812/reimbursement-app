// src/pages/ClosedClaims.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useClaims } from "../state/ClaimsContext";
import { useAuth } from "../state/AuthContext";
import { toast } from "../lib/toast";
import { centsFromClaim, formatCents } from "../lib/money";

import { C_NIGHT, C_CHAR, C_CLOUD, C_GUN, C_SLATE, C_STEEL } from "../theme/palette";

/** ─────────────────────────  PALETTE MAP  ───────────────────────── **/
export const C_OFFEE    = C_NIGHT;  // headings / strongest text
export const C_COCOA    = C_GUN;    // primary buttons
export const C_TAUPE    = C_CHAR;   // secondary accents
export const C_LINEN    = C_SLATE;  // borders / subtle text
export const C_EGGSHELL = C_STEEL;  // app surface
export const C_CARD     = C_CLOUD;  // cards

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
const displayAmountCents = (c) => formatCents(centsFromClaim(c));
const formatDate = (ts) => { try { return new Date(ts).toLocaleString(); } catch { return ts || ""; } };

/** Local pagination in palette */
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
    borderColor: C_LINEN,
    color: C_OFFEE,
    background: C_EGGSHELL,
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-60"
        style={baseBtn}
      >
        Prev
      </button>

      {seq.map((n, i) =>
        n === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2" style={{ color: `${C_OFFEE}B3` }}>
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
            className="px-3 py-1.5 rounded-md border text-sm"
            style={
              n === page
                ? { background: C_COCOA, color: C_EGGSHELL, borderColor: C_COCOA }
                : baseBtn
            }
          >
            {n}
          </button>
        )
      )}

      <button
        onClick={() => onPage(Math.min(pages, page + 1))}
        disabled={page >= pages}
        className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-60"
        style={baseBtn}
      >
        Next
      </button>
    </div>
  );
}

const PAGE_SIZE = 3;

export default function ClosedClaims() {
  const { closed = [], loading, refresh } = useClaims();
  const auth = useAuth();

  const [page, setPage] = useState(1);
  const [openingId, setOpeningId] = useState(null);
  const [viewer, setViewer] = useState({ open: false, url: null, type: null, filename: null, claimId: null });

  useEffect(() => { refresh?.().catch(() => {}); }, []); // mount
  useEffect(() => () => { if (viewer.url) URL.revokeObjectURL(viewer.url); }, [viewer.url]);

  const total = closed?.length ?? 0;
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return (closed || []).slice(start, start + PAGE_SIZE);
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
      const res = await fetch(`${API_BASE_URL}/api/claims/${claimId}/receipt`, {
        method: "GET", headers, credentials: "include",
      });

      if (res.status === 404) { toast?.("No receipt uploaded for this claim", { type: "warning" }); return; }

      const ctRaw = (res.headers.get("content-type") || "").toLowerCase();
      if (ctRaw.startsWith("text/html")) {
        toast?.("Receipt endpoint returned HTML (likely auth/proxy issue)", { type: "error" });
        return;
      }

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

      const canPreview = isPdfCT(ct) || isImgCT(ct);
      if (!canPreview) { downloadBlob(blob, filename); return; }

      const url = URL.createObjectURL(blob);
      setViewer({ open: true, url, type: ct, filename, claimId });
    } catch (e) {
      console.error(e);
      toast?.(e?.message || "Could not open receipt", { type: "error" });
    } finally { setOpeningId(null); }
  }

  function closeViewer() {
    if (viewer.url) URL.revokeObjectURL(viewer.url);
    setViewer({ open: false, url: null, type: null, filename: null, claimId: null });
  }
  function downloadFromViewer() {
    if (!viewer.url) return;
    fetch(viewer.url)
      .then((r) => r.blob())
      .then((b) => downloadBlob(b, viewer.filename || "receipt"))
      .catch(() => window.open(viewer.url, "_blank"));
  }

  return (
    <div className="space-y-6" style={{ color: C_OFFEE }}>
      <h1 className="text-xl sm:text-2xl font-semibold">Closed Claims</h1>

      {loading && <p style={{ color: `${C_OFFEE}99` }}>Loading…</p>}
      {!loading && total === 0 && <p style={{ color: `${C_OFFEE}99` }}>No closed claims.</p>}

      {!!total && (
        <>
          <div className="grid gap-3">
            {pageItems.map((c) => {
              const id = c.id ?? c.claimId;
              const canView = c.hasReceipt === true;
              const closedTs = c.closedAt || c.updatedAt || c.createdAt;

              return (
                <div
                  key={id}
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: C_LINEN, background: C_CARD }}
                >
                  {/* header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: C_GUN, background: C_GUN, color: "white" }}
                  >
                    <div className="min-w-0">
                      <div className="text-xs opacity-70 truncate">Claim #{id}</div>
                      <div className="font-medium capitalize truncate">
                        {c.title ?? c.category ?? "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canView && (
                        <button
                          onClick={() => viewReceipt(id)}
                          className="text-sm px-3 py-1.5 rounded-md border disabled:opacity-60"
                          style={{
                            borderColor: C_LINEN,
                            color: C_COCOA,
                            background: C_EGGSHELL,
                            opacity: openingId === id ? 0.7 : 1,
                          }}
                          disabled={openingId === id}
                          title="View receipt"
                        >
                          {openingId === id ? "Opening…" : "View receipt"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* body */}
                  <div className="px-4 py-3 grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div style={{ color: `${C_OFFEE}99` }}>Status</div>
                      <div className="font-medium">{c.status ?? "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: `${C_OFFEE}99` }}>Closed</div>
                      <div className="font-medium">{formatDate(closedTs)}</div>
                    </div>
                    <div>
                      <div style={{ color: `${C_OFFEE}99` }}>Amount</div>
                      <div className="font-medium">{displayAmountCents(c)}</div>
                    </div>
                    <div>
                      <div style={{ color: `${C_OFFEE}99` }}>Type</div>
                      <div className="font-medium">{c.claimType || "—"}</div>
                    </div>

                    {c.status === "REJECTED" && (
                      <div className="sm:col-span-2">
                        <div style={{ color: `${C_OFFEE}99` }}>Reject Reason</div>
                        <div className="font-medium" style={{ color: "#b91c1c" }}>
                          {c.adminComment || "—"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <LocalPagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </>
      )}

      {/* Viewer */}
      {viewer.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-5xl rounded-xl border shadow-xl overflow-hidden flex flex-col"
            style={{ background: C_CARD, borderColor: C_LINEN }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: C_GUN, color: "white", background: C_GUN }}
            >
              <div className="min-w-0">
                <div className="text-xs opacity-70 truncate">Claim #{viewer.claimId}</div>
                <div className="font-medium truncate">{viewer.filename || "receipt"}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadFromViewer}
                  className="text-sm px-3 py-1.5 rounded-md"
                  style={{ background: C_COCOA, color: C_EGGSHELL }}
                >
                  Download
                </button>
                <button
                  onClick={closeViewer}
                  className="text-sm px-3 py-1.5 rounded-md border"
                  style={{ borderColor: C_LINEN, color: C_OFFEE, background: C_EGGSHELL }}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-0 h-[70vh]">
              {isImgCT(viewer.type) ? (
                <div
                  className="w-full h-full overflow-auto flex items-center justify-center"
                  style={{ background: C_EGGSHELL }}
                >
                  <img src={viewer.url} alt="Receipt" className="max-w-full max-h-full" />
                </div>
              ) : isPdfCT(viewer.type) ? (
                <iframe src={viewer.url} title="Receipt PDF" className="w-full h-full border-0" />
              ) : (
                <div className="p-6 text-sm" style={{ color: `${C_OFFEE}99` }}>
                  Preview not available for{" "}
                  <span className="font-mono">{viewer.type || "unknown"}</span>. Click{" "}
                  <button onClick={downloadFromViewer} className="underline" style={{ color: C_COCOA }}>
                    Download
                  </button>{" "}
                  to save the file.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
