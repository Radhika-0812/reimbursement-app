// src/pages/CreateClaim.jsx
import React, { useState } from "react";
import { toast } from "../lib/toast";
import { CURRENCY_META } from "../lib/money";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://reimbursement-app-7wy3.onrender.com";

/* ---------- Auth + HTTP (unchanged) ---------- */
function getAuth() {
  const keys = [
    import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token",
    "access_token",
    "token",
    "jwt",
  ];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  const m = document.cookie.match(/(?:^|; )(?:auth_token|access_token)=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function http(method, path, { token, body, headers: extra } = {}) {
  const url = path.startsWith("http") ? path : API_BASE_URL + path;
  const headers = { ...(extra || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !headers["Content-Type"]) {
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
    const t = await res.text().catch(() => "");
    const err = new Error(t || `HTTP ${res.status}`);
    err.status = res.status;
    err.responseText = t;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

/* ---------- Helpers for multi-row UI ---------- */
const CLAIM_TYPES = ["CAB_ALLOWANCE", "MEAL", "PETROL_ALLOWANCE", "OFFICE_SUPPLY", "POSTAGE"];

function newRow() {
  return {
    title: "",
    amount: "",                         // whole units (no /100)
    currency: "INR",
    claimType: "CAB_ALLOWANCE",
    claimDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    description: "",
    receiptFile: null,
  };
}

function validateRow(row) {
  if (!row.title.trim()) return "Title is required";
  const n = Number(row.amount);
  if (!Number.isFinite(n) || n <= 0) return "Amount must be a positive number";
  if (!row.currency) return "Currency is required";
  if (!row.claimType) return "Claim type is required";
  if (!row.claimDate) return "Claim date is required";
  return null;
}

/* ---------- Robust batch submitter ----------
   Tries endpoints in order:
   1) POST /api/claims/batch with an array
   2) POST /api/claims with an array
   3) POST /api/claims one-by-one (fallback)
------------------------------------------------ */
async function createManyClaims(token, rows) {
  const batch = rows.map((r) => ({
    // 👇 EXACT KEYS you showed in your sample body:
    title: r.title.trim(),
    claimDate: r.claimDate,             // "YYYY-MM-DD"
    amountCents: Number(r.amount),      // whole units as discussed
    currencyCode: r.currency,           // e.g. "INR" / "MYR"
    claimType: r.claimType,
    description: r.description || "",
    receiptUrl: null, // uploaded next
    // 👇 extra keys for backends that expect different names (safe no-ops)
    amount: Number(r.amount),
    currency: r.currency,
  }));

  // helper to normalize various server responses to an array
  const normalize = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (data?.id || data?.claimId) return [data];
    return [];
  };

  // 1) try /batch
  try {
    const data = await http("POST", "/api/claims", { token, body: batch });
    console.log(data.CLAIM_TYPES);
    return normalize(data);
  } catch (e) {
    // only fall through on typical "wrong endpoint" errors
    if (![404, 400, 405, 415].includes(e.status)) throw e;
  }

  // 2) try posting array to /api/claims
  try {
    const data = await http("POST", "/api/claims", { token, body: batch });
    return normalize(data);
  } catch (e) {
    if (![404, 400, 405, 415].includes(e.status)) throw e;
  }

  // 3) fallback: post one-by-one to /api/claims
  const created = [];
  for (const item of batch) {
    const data = await http("POST", "/api/claims", { token, body: item });
    created.push(...normalize(data));
  }
  return created;
}

/* ====================== Page ====================== */
export default function CreateClaim() {
  const token = getAuth();

  // 🔹 MULTI-CLAIM rows
  const [rows, setRows] = useState([newRow()]);
  const [submitting, setSubmitting] = useState(false);

  function patchRow(i, patch) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }
  function removeRow(i) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function onSubmitAll(e) {
    e.preventDefault();

    // validate all
    for (let i = 0; i < rows.length; i++) {
      const msg = validateRow(rows[i]);
      if (msg) {
        toast(`Row ${i + 1}: ${msg}`, { type: "warning" });
        const el = document.querySelector(`[data-row="${i}"] input, [data-row="${i}"] select, [data-row="${i}"] textarea`);
        el?.focus();
        return;
      }
    }

    setSubmitting(true);
    try {
      // create all claims (resilient to your backend’s shape)
      const createdList = await createManyClaims(token, rows);

      // upload receipts matching order (if server returns same order)
      let uploaded = 0;
      for (let i = 0; i < rows.length; i++) {
        const file = rows[i].receiptFile;
        if (!file) continue;

        const claimId = createdList[i]?.id ?? createdList[i]?.claimId;
        if (!claimId) continue;

        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch(`${API_BASE_URL}/api/claims/${claimId}/receipt`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
          credentials: "include",
        });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(t || `Receipt upload failed for row ${i + 1}`);
        }
        uploaded++;
      }

      toast(
        `Submitted ${rows.length} claim${rows.length > 1 ? "s" : ""}` +
          (uploaded ? ` • receipts uploaded: ${uploaded}` : ""),
        { type: "success" }
      );

      // reset to one clean row
      setRows([newRow()]);
    } catch (e) {
      toast(e.responseText || e.message || "Submit failed", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: "var(--foreground)" }}>
        Create Claim
      </h1>

      <form onSubmit={onSubmitAll} className="space-y-4">
        {rows.map((row, i) => {
          const symbol = CURRENCY_META[row.currency]?.symbol || "";
          return (
            <div
              key={i}
              data-row={i}
              className="rounded-xl border p-4"
              style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold opacity-80">Claim #{i + 1}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-60">
                    {row.currency === "MYR" ? "Ringgit Malaysia (RM)" : "Indian Rupees (₹)"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="px-2 py-1 rounded-md border text-xs disabled:opacity-60"
                    style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                    disabled={rows.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="text-sm block mb-1">Title</label>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  value={row.title}
                  onChange={(e) => patchRow(i, { title: e.target.value })}
                  placeholder="e.g. Airport cab"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm block mb-1">Amount</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-70 w-10 text-right">{symbol}</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-3 py-2"
                      style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                      value={row.amount}
                      onChange={(e) => patchRow(i, { amount: e.target.value })}
                      placeholder="e.g. 4000"
                      min="1"
                      step="1"
                    />
                  </div>
                  <div className="text-[11px] mt-1 opacity-70">Enter whole amount (no paise/sen).</div>
                </div>

                <div>
                  <label className="text-sm block mb-1">Currency</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 bg-transparent"
                    style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                    value={row.currency}
                    onChange={(e) => patchRow(i, { currency: e.target.value })}
                  >
                    {Object.keys(CURRENCY_META).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm block mb-1">Claim Date</label>
                  <input
                    type="date"
                    className="w-full rounded-md border px-3 py-2"
                    style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                    value={row.claimDate}
                    onChange={(e) => patchRow(i, { claimDate: e.target.value })}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-sm block mb-1">Claim Type</label>
                <select
                  className="w-full rounded-md border px-3 py-2 bg-transparent"
                  style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  value={row.claimType}
                  onChange={(e) => patchRow(i, { claimType: e.target.value })}
                >
                  {CLAIM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3">
                <label className="text-sm block mb-1">Description (optional)</label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  value={row.description}
                  onChange={(e) => patchRow(i, { description: e.target.value })}
                  placeholder="Any details that help reviewers"
                />
              </div>

              <div className="mt-3">
                <label className="text-sm block mb-1">Receipt (optional)</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*,application/pdf"
                  onChange={(e) => patchRow(i, { receiptFile: e.target.files?.[0] || null })}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5"
                />
                <div className="text-xs mt-1" style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>
                  Allowed: images, PDF, Office docs, txt, csv. Max 10MB.
                </div>
              </div>
            </div>
          );
        })}

        {/* Row controls + submit */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={addRow}
            className="px-3 py-2 rounded-md border"
            style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            + Add another claim
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRows([newRow()])}
              disabled={submitting}
              className="px-4 py-2 rounded-md border disabled:opacity-60"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              Reset
            </button>
            <button
              disabled={submitting}
              className="px-4 py-2 rounded-md text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}
              type="submit"
            >
              {submitting ? "Submitting…" : `Submit ${rows.length} claim${rows.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
