// src/pages/PendingClaims.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useClaims } from "../state/ClaimsContext";
import Pagination from "../components/Pagination";
import { on } from "../lib/eventBus";
import { toast } from "../lib/toast";
import { useAuth } from "../state/AuthContext";
import { centsFromClaim, formatCents } from "../lib/money";

import { C_NIGHT, C_CHAR, C_CLOUD, C_GUN, C_SLATE, C_STEEL } from "../theme/palette";

/** ─────────────────────────  PALETTE MAP  ───────────────────────── **/
export const C_OFFEE    = C_NIGHT;  // strongest text
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

const PAGE_SIZE = 5;

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
    const m = /filename\s*=\s*\"?([^\";]+)\"?/i.exec(contentDisposition);
    if (m) return decodeURIComponent(m[1]);
  } catch {}
  return fallback;
}
function extFromFilename(name = "") {
  const i = name.lastIndexOf(".");
  if (i === -1) return "";
  return name.substring(i + 1).toLowerCase();
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
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  return "";
}
const displayAmountCents = (claim) => formatCents(centsFromClaim(claim));

export default function PendingClaims() {
  const { pending = [], loading, refresh } = useClaims();
  const auth = useAuth();

  const [page, setPage] = useState(1);
  const [openingId, setOpeningId] = useState(null);
  const [hasReceiptMap, setHasReceiptMap] = useState({});
  const [viewer, setViewer] = useState({ open: false, url: null, type: null, filename: null, claimId: null });

  useEffect(() => { refresh?.().catch(() => {}); }, []); // initial
  useEffect(() => {
    const off = on("claims:changed", () => { toast("Claims updated", { type: "info" }); refresh?.(); });
    return off;
  }, [refresh]);

  const total = pending?.length || 0;
  const pageItems = useMemo(() => {
    if (!Array.isArray(pending)) return [];
    const start = (page - 1) * PAGE_SIZE;
    return pending.slice(start, start + PAGE_SIZE);
  }, [pending, page]);

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

  // Probe for receipts when metadata isn't present
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
          const res = await fetch(`${API_BASE_URL}/api/claims/${id}/receipt`, {
            method: "HEAD", headers, credentials: "include",
          });
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
      const res = await fetch(`${API_BASE_URL}/api/claims/${claimId}/receipt`, {
        method: "GET", headers, credentials: "include",
      });
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

      const canPreview = isPdfCT(ct) || isImgCT(ct);
      if (!canPreview) { downloadBlob(blob, filename); return; }

      const url = URL.createObjectURL(blob);
      setViewer({ open: true, url, type: ct, filename, claimId });
    } catch (e) {
      console.error(e);
      toast(e.message || "Could not open receipt", { type: "error" });
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
      <h1 className="text-xl sm:text-2xl font-semibold">Pending Claims</h1>

      {loading && <p style={{ color: `${C_OFFEE}99` }}>Loading…</p>}

      {!loading && (pending?.length || 0) === 0 && (
        <p style={{ color: `${C_OFFEE}99` }}>No pending claims.</p>
      )}

      {!loading && (pending?.length || 0) > 0 && (
        <>
          {/* Card container for the list */}
          <div
            className="rounded-[1.25rem] border p-4 sm:p-5"
            style={{ background: C_GUN, borderColor: C_LINEN }}
          >
            <div className="space-y-3">
              {pageItems.map((c) => {
                const id = c.id ?? c.claimId;
                const canView = hasReceiptFor(c);
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-xl border p-4"
                    style={{ borderColor: C_LINEN, background:C_CARD }}
                  >
                    <div>
                      <div className="font-medium capitalize" style={{ color: C_OFFEE }}>
                        {c.title ?? c.category}
                      </div>
                      <div className="text-sm" style={{ color: `${C_OFFEE}99` }}>
                        Status: Pending
                      </div>
                      {c.createdAt && (
                        <div className="text-sm" style={{ color: `${C_OFFEE}80` }}>
                          Created: {new Date(c.createdAt).toLocaleString()}
                        </div>
                      )}
                      <div className="text-sm" style={{ color: C_OFFEE }}>
                        Amount: {displayAmountCents(c)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canView && (
                        <button
                          onClick={() => viewReceipt(id)}
                          disabled={openingId === id}
                          title="View receipt"
                          className="text-sm px-3 py-1.5 rounded-md border"
                          style={{
                            borderColor: C_LINEN,
                            color: C_COCOA,
                            background: C_EGGSHELL,
                            opacity: openingId === id ? 0.7 : 1,
                          }}
                        >
                          {openingId === id ? "Opening…" : "View receipt"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination sits inside the card for tighter visual grouping */}
            <div className="mt-4">
              <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
          </div>
        </>
      )}

      {/* Viewer modal */}
      {viewer.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-5xl rounded-xl border shadow-xl overflow-hidden flex flex-col"
            style={{ background: C_CARD, borderColor: C_LINEN }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: C_LINEN, color: "white", background: C_GUN }}
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
                  style={{ background: C_GUN }}
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
