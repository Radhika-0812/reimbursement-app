// src/pages/PendingClaims.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useClaims } from "../state/ClaimsContext";
import Pagination from "../components/Pagination";
import { on } from "../lib/eventBus";
import { toast } from "../lib/toast";
import { useAuth } from "../state/AuthContext";
import { centsFromClaim, formatCents } from "../lib/money"; // show cents (paise), not rupees

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
    // filename*=UTF-8''my%20file.pdf OR filename="my file.pdf"
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
function isPdfCT(ct = "") {
  return ct.includes("application/pdf");
}
function isImgCT(ct = "") {
  return ct.startsWith("image/");
}
// Tiny magic-number sniffing as a last resort
async function sniffMime(blob) {
  const buf = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  // PDF: %PDF-
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) return "application/pdf";
  // JPG: FF D8
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return "image/png";
  // GIF: GIF87a / GIF89a
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) return "image/gif";
  // BMP: BM
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "image/bmp";
  // WEBP: RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  return "";
}

function displayAmountCents(claim) {
  return formatCents(centsFromClaim(claim));
}

export default function PendingClaims() {
  const { pending = [], loading, refresh } = useClaims();
  const auth = useAuth();

  const [page, setPage] = useState(1);
  const [openingId, setOpeningId] = useState(null);
  const [hasReceiptMap, setHasReceiptMap] = useState({}); // { [claimId]: true|false }

  // In‑app viewer state (same UX as AdminDashboard/ClosedClaims)
  const [viewer, setViewer] = useState({
    open: false,
    url: null,
    type: null,
    filename: null,
    claimId: null,
  });

  useEffect(() => {
    refresh?.().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when something changes elsewhere
  useEffect(() => {
    const off = on("claims:changed", () => {
      toast("Claims updated", { type: "info" });
      refresh?.();
    });
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
      try {
        const t = await auth.getAccessToken();
        if (t) return { Authorization: `Bearer ${t}` };
      } catch {}
    }
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // If API didn't include hasReceipt metadata, probe with HEAD /receipt for visible rows
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
            method: "HEAD",
            headers,
            credentials: "include",
          });
          setHasReceiptMap((m) => ({ ...m, [id]: res.ok })); // 200/2xx => true, 404 => false
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
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function viewReceipt(claimId) {
    setOpeningId(claimId);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE_URL}/api/claims/${claimId}/receipt`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (res.status === 404) {
        setHasReceiptMap((m) => ({ ...m, [claimId]: false }));
        toast("No receipt uploaded for this claim", { type: "warning" });
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to fetch receipt");
      }

      // If the server replied with HTML (e.g., login page), treat as error
      let ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.startsWith("text/html")) {
        toast("Receipt endpoint returned HTML (auth/proxy/base URL issue)", { type: "error" });
        return;
      }

      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const fallbackName = `receipt-${claimId}`;
      let filename = extractFilename(cd, fallbackName);

      // Normalize content-type using filename and sniffing if needed
      const ext = extFromFilename(filename);
      if (!ct || ct === "application/octet-stream") {
        if (ext === "pdf") ct = "application/pdf";
        if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext))
          ct = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      }
      if (!ct || ct === "application/octet-stream") {
        const sniffed = await sniffMime(blob);
        if (sniffed) ct = sniffed;
      }

      // Preview only for PDF/images; otherwise download immediately
      const canPreview = isPdfCT(ct) || isImgCT(ct);
      if (!canPreview) {
        downloadBlob(blob, filename);
        return;
      }

      const url = URL.createObjectURL(blob);
      setViewer({ open: true, url, type: ct, filename, claimId });
    } catch (e) {
      console.error(e);
      toast(e.message || "Could not open receipt", { type: "error" });
    } finally {
      setOpeningId(null);
    }
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
    <div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4">Pending Claims</h1>

        {loading && <p>Loading…</p>}

        {!loading && total === 0 && <p className="text-gray-500">No pending claims.</p>}

        {!loading && total > 0 && (
          <>
            <div className="space-y-3">
              {pageItems.map((c) => {
                const id = c.id ?? c.claimId;
                const canView = hasReceiptFor(c);
                return (
                  <div key={id} className="flex items-center justify-between border p-4 rounded-lg bg-white">
                    <div>
                      <div className="font-medium capitalize">{c.title ?? c.category}</div>
                      <div className="text-sm text-gray-600">Status: Pending</div>
                      {c.createdAt && (
                        <div className="text-sm text-gray-500">Created: {new Date(c.createdAt).toLocaleString()}</div>
                      )}
                      <div className="text-sm text-gray-700">Amount: {displayAmountCents(c)}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canView && (
                        <button
                          onClick={() => viewReceipt(id)}
                          className="text-sm px-3 py-1.5 rounded-md border border-blue-200 text-blue-900 hover:bg-blue-50 disabled:opacity-60"
                          disabled={openingId === id}
                          title="View receipt"
                        >
                          {openingId === id ? "Opening…" : "View receipt"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>

      {/* AdminDashboard-style viewer */}
      {viewer.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="min-w-0">
                <div className="text-sm text-gray-500 truncate">Claim #{viewer.claimId}</div>
                <div className="font-medium truncate">{viewer.filename || "receipt"}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadFromViewer} className="text-sm px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50">Download</button>
                <button onClick={closeViewer} className="text-sm px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50">Close</button>
              </div>
            </div>

            <div className="p-0 h-[70vh]">
              {isImgCT(viewer.type) ? (
                <div className="w-full h-full overflow-auto flex items-center justify-center bg-gray-50">
                  <img src={viewer.url} alt="Receipt" className="max-w-full max-h-full" />
                </div>
              ) : isPdfCT(viewer.type) ? (
                <iframe src={viewer.url} title="Receipt PDF" className="w-full h-full border-0" />
              ) : (
                <div className="p-6 text-sm text-gray-600">
                  Preview not available for <span className="font-mono">{viewer.type || "unknown"}</span>. Click <button onClick={downloadFromViewer} className="underline">Download</button> to save the file.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
