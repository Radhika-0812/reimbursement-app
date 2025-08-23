// src/pages/ClosedClaims.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useClaims } from "../state/ClaimsContext";
import { useAuth } from "../state/AuthContext";
// If you already have a toast helper. If not, replace toast?.(...) with console.log.
import { toast } from "../lib/toast";
import { centsFromClaim, formatCents } from "../lib/money"; // show cents (paise), not rupees

// ---------- Config ----------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const AUTH_TOKEN_KEYS = [
  import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token",
  "access_token",
  "token",
];

// ---------- Small helpers ----------
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
    const m = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
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
// very small signature sniff (first bytes)
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
function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts || "";
  }
}

// Small local pagination so you don’t need another component
// Small local pagination with styled buttons (blue-950 bg + white border)
function LocalPagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null; // hide when single page

  const baseBtn =
    "px-3 py-1.5 rounded border text-sm transition-colors select-none";
  const primaryBtn =
    "bg-blue-950 text-white border-white hover:bg-blue-900";
  const disabledBtn = "opacity-50 cursor-not-allowed";

  // Make a compact window of numbers (with first/last and ellipses)
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(pages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const nums = [];
  if (start > 1) {
    nums.push(1);
    if (start > 2) nums.push("…");
  }
  for (let p = start; p <= end; p++) nums.push(p);
  if (end < pages) {
    if (end < pages - 1) nums.push("…");
    nums.push(pages);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      {/* Prev */}
      <button
        className={`${baseBtn} ${primaryBtn} ${page <= 1 ? disabledBtn : ""}`}
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        Prev
      </button>

      {/* number buttons */}
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-white/80">
            …
          </span>
        ) : (
          <button
            key={n}
            aria-current={n === page ? "page" : undefined}
            onClick={() => onPage(n)}
            className={`${baseBtn} ${primaryBtn} ${
              n === page ? "ring-2 ring-white/80 ring-offset-0" : ""
            }`}
          >
            {n}
          </button>
        )
      )}

      {/* Next */}
      <button
        className={`${baseBtn} ${primaryBtn} ${
          page >= pages ? disabledBtn : ""
        }`}
        onClick={() => onPage(Math.min(pages, page + 1))}
        disabled={page >= pages}
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
  const [viewer, setViewer] = useState({
    open: false,
    url: null,
    type: null,
    filename: null,
    claimId: null,
  });

  useEffect(() => {
    refresh?.(); // refresh on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    return () => {
      if (viewer.url) URL.revokeObjectURL(viewer.url);
    };
  }, [viewer.url]);

  const total = closed?.length ?? 0;
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return (closed || []).slice(start, start + PAGE_SIZE);
  }, [closed, page]);

  async function authHeader() {
    if (auth?.getAccessToken) {
      try {
        const t = await auth.getAccessToken();
        if (t) return { Authorization: `Bearer ${t}` };
      } catch {}
    }
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
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
      const headers = await authHeader();
      const res = await fetch(`${API_BASE_URL}/api/claims/${claimId}/receipt`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (res.status === 404) {
        toast?.("No receipt uploaded for this claim", { type: "warning" });
        return;
      }

      // If server returns HTML (login/index), do not preview
      const ctRaw = (res.headers.get("content-type") || "").toLowerCase();
      if (ctRaw.startsWith("text/html")) {
        toast?.("Receipt endpoint returned HTML (likely auth/proxy issue)", { type: "error" });
        return;
      }

      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const fallbackName = `receipt-${claimId}`;
      let filename = extractFilename(cd, fallbackName);
      let ct = ctRaw || "";

      // Fallback: infer from filename ext if header is generic
      const ext = extFromFilename(filename);
      if (!ct || ct === "application/octet-stream") {
        if (["pdf"].includes(ext)) ct = "application/pdf";
        if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext))
          ct = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      }

      // Last resort: sniff bytes
      if (!ct || ct === "application/octet-stream") {
        const sniffed = await sniffMime(blob);
        if (sniffed) ct = sniffed;
      }

      // Decision: preview only PDF or image; otherwise download
      const canPreview = isPdfCT(ct) || isImgCT(ct);
      if (!canPreview) {
        downloadBlob(blob, filename);
        return;
      }

      const url = URL.createObjectURL(blob);
      setViewer({ open: true, url, type: ct, filename, claimId });
    } catch (e) {
      console.error(e);
      toast?.(e?.message || "Could not open receipt", { type: "error" });
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
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4">Closed Claims</h1>

      {loading && <p>Loading…</p>}
      {!loading && total === 0 && <p className="text-gray-500">No closed claims.</p>}

      {!loading && total > 0 && (
        <>
          <div className="grid gap-3">
            {pageItems.map((c) => {
              const id = c.id ?? c.claimId;
              const canView = c.hasReceipt === true;
              const closedTs = c.closedAt || c.updatedAt || c.createdAt;

              return (
                <div key={id} className="border rounded-xl bg-white overflow-hidden">
                  {/* header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-500 truncate">Claim #{id}</div>
                      <div className="font-medium capitalize truncate">{c.title ?? c.category ?? "—"}</div>
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

                  {/* body */}
                  <div className="px-4 py-3 grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-600">Status</div>
                      <div className="font-medium">{c.status ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Closed</div>
                      <div className="font-medium">{formatDate(closedTs)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Amount</div>
                      <div className="font-medium">{displayAmountCents(c)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Type</div>
                      <div className="font-medium">{c.claimType || "—"}</div>
                    </div>

                    {/* Admin comment (for REJECTED) */}
                    {c.status === "REJECTED" && (
                      <div className="sm:col-span-2">
                        <div className="text-gray-600">Admin comment</div>
                        <div className="font-medium text-red-700 break-words">{c.adminComment || "—"}</div>
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
                <button
                  onClick={downloadFromViewer}
                  className="text-sm px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
                >
                  Download
                </button>
                <button
                  onClick={closeViewer}
                  className="text-sm px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
                >
                  Close
                </button>
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
                  Preview not available for{" "}
                  <span className="font-mono">{viewer.type || "unknown"}</span>. Click{" "}
                  <button onClick={downloadFromViewer} className="underline">
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
