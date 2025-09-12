// src/pages/EditClaim.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClaims } from "../state/ClaimsContext";
import { useAuth } from "../state/AuthContext";
import { toast } from "../lib/toast";
import { CURRENCY_META } from "../lib/money";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://reimbursement-app-7wy3.onrender.com";
const AUTH_TOKEN_KEYS = [
  import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token",
  "access_token",
  "token",
];

const CLAIM_TYPES = ["CAB_ALLOWANCE","MEAL","PETROL_ALLOWANCE","OFFICE_SUPPLY","POSTAGE"];

function getStoredToken() {
  for (const k of AUTH_TOKEN_KEYS) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  return null;
}
async function authHeaders(getAccessToken) {
  if (getAccessToken) {
    try { const t = await getAccessToken(); if (t) return { Authorization: `Bearer ${t}` }; } catch {}
  }
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const isRecall = (c) => {
  const s = String(c?.status || "").toUpperCase();
  return (
    s === "RECALLED" ||
    s === "NEEDS_INFO" ||
    c?.recallActive === true ||
    c?.recallRequired === true ||
    c?.recall_required === true ||
    c?.recall?.active === true
  );
};
const needsAttachment = (c) =>
  !!(c?.recallRequireAttachment || c?.recall_require_attachment || c?.recall?.requireAttachment);

export default function EditClaim() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const { pending = [], refresh } = useClaims();
  const auth = useAuth();

  const [busy, setBusy] = useState(false);
  const [claim, setClaim] = useState(null);
  const [form, setForm] = useState({
    title: "",
    amount: "",      // whole units
    currency: "INR",
    claimType: "CAB_ALLOWANCE",
    claimDate: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const [hasReceipt, setHasReceipt] = useState(false);
  const [opening, setOpening] = useState(false);
  const hiddenFile = useRef(null);

  // 1) prime from context; fallback to fetch my/pending (first few pages)
  useEffect(() => {
    let mounted = true;
    (async () => {
      // try from context
      const fromCtx = (pending || []).find((c) => (c.id ?? c.claimId) === id);
      if (fromCtx) {
        if (!mounted) return;
        setClaim(fromCtx);
        seedForm(fromCtx);
        probeReceipt(fromCtx);
        return;
      }

      // fallback: pull first N pending pages then search
      try {
        const headers = await authHeaders(auth?.getAccessToken);
        // pull a bigger page to likely include it
        const r = await fetch(`${API_BASE_URL}/api/claims/me/pending?page=1&size=200`, {
          headers, credentials: "include",
        });
        if (r.ok) {
          const data = await r.json();
          const found = (data?.content || []).find((c) => (c.id ?? c.claimId) === id);
          if (found && mounted) {
            setClaim(found);
            seedForm(found);
            probeReceipt(found);
          }
        }
      } catch {}
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, pending]);

  function seedForm(c) {
    setForm({
      title: c.title || "",
      amount: String(c.amountCents ?? c.amount ?? "").replace(/[^0-9]/g, "") || "",
      currency: c.currencyCode || c.currency || "INR",
      claimType: c.claimType || "CAB_ALLOWANCE",
      claimDate: (c.claimDate || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
      description: c.description || "",
    });
  }

  async function probeReceipt(c) {
    try {
      const headers = await authHeaders(auth?.getAccessToken);
      const res = await fetch(`${API_BASE_URL}/api/claims/${c.id ?? c.claimId}/receipt`, {
        method: "HEAD", headers, credentials: "include",
      });
      setHasReceipt(res.ok || !!c.receiptFilename || (c.receiptSize ?? 0) > 0 || c.hasReceipt === true);
    } catch {
      setHasReceipt(false);
    }
  }

  const recalled = useMemo(() => isRecall(claim), [claim]);
  const mustAttach = useMemo(() => needsAttachment(claim), [claim]);

  function onChange(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!claim) return;
    if (!form.title.trim()) { toast("Title is required", { type: "warning" }); return; }
    if (!/^\d+$/.test(form.amount)) { toast("Amount must be a positive whole number", { type: "warning" }); return; }
    if (!form.claimDate) { toast("Claim date is required", { type: "warning" }); return; }

    setBusy(true);
    try {
      const headers = await authHeaders(auth?.getAccessToken);
      // Backend currently exposes PUT /api/claims/{id} (UpdateClaimRequest) for recall edits.
      // We call it for both Pending and Recalled; server will enforce rules.
      const payload = {
        title: form.title.trim(),
        amount: Number(form.amount),            // whole units (server can map)
        amountCents: Number(form.amount),       // compatibility
        currency: form.currency,
        currencyCode: form.currency,
        claimType: form.claimType,
        claimDate: form.claimDate,
        description: form.description || "",
      };
      const res = await fetch(`${API_BASE_URL}/api/claims/${id}`, {
        method: "PUT",
        headers: { ...(headers || {}), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(
          t ||
            (recalled
              ? "Update failed (recall edit)"
              : "Update failed (pending edit may be restricted by server)")
        );
      }
      toast("Changes saved", { type: "success" });
      await refresh?.();
      navigate(-1);
    } catch (e) {
      toast(e.message || "Could not save", { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(file) {
    if (!file) return;
    setBusy(true);
    try {
      const headers = await authHeaders(auth?.getAccessToken);
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API_BASE_URL}/api/claims/${id}/receipt`, {
        method: "POST", headers, body: fd, credentials: "include",
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || "Receipt upload failed");
      }
      setHasReceipt(true);
      toast("Receipt uploaded", { type: "success" });
    } catch (e) {
      toast(e.message || "Upload failed", { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleView() {
    setOpening(true);
    try {
      const headers = await authHeaders(auth?.getAccessToken);
      const r = await fetch(`${API_BASE_URL}/api/claims/${id}/receipt`, { headers, credentials: "include" });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || "Could not open receipt");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener";
      a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 0);
    } catch (e) {
      toast(e.message || "Open failed", { type: "error" });
    } finally {
      setOpening(false);
    }
  }

  if (!claim) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4">Edit Claim</h1>
        <div className="text-sm" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>
          Loading claim…
        </div>
      </div>
    );
  }

  const currencySymbol = CURRENCY_META[form.currency]?.symbol || "";

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold">Edit Claim</h1>
        <button
          className="px-3 py-1.5 rounded-md border"
          style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </div>

      {(recalled || mustAttach) && (
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in oklch, var(--destructive) 10%, transparent)",
          }}
        >
          <div className="text-sm font-medium" style={{ color: "var(--destructive)" }}>
            {mustAttach ? "Admin requires an attachment." : "Admin requested changes."}
          </div>
          <div className="text-xs mt-1" style={{ color: "color-mix(in oklch, var(--foreground) 75%, transparent)" }}>
            {mustAttach
              ? "Please upload the missing/updated receipt and save your changes."
              : "You can update details and optionally upload/replace the receipt."}
          </div>
        </div>
      )}

      <div className="rounded-xl border p-4"
           style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm block mb-1">Title</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
              value={form.title}
              onChange={(e)=>onChange("title", e.target.value)}
              placeholder="e.g. Airport cab"
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Amount</label>
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-70 w-10 text-right">{currencySymbol}</span>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2"
                style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                value={form.amount}
                onChange={(e)=>onChange("amount", e.target.value.replace(/[^0-9]/g,""))}
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
              value={form.currency}
              onChange={(e)=>onChange("currency", e.target.value)}
            >
              {Object.keys(CURRENCY_META).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm block mb-1">Claim Date</label>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
              value={form.claimDate}
              onChange={(e)=>onChange("claimDate", e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Claim Type</label>
            <select
              className="w-full rounded-md border px-3 py-2 bg-transparent"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
              value={form.claimType}
              onChange={(e)=>onChange("claimType", e.target.value)}
            >
              {CLAIM_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm block mb-1">Description (optional)</label>
            <textarea
              rows={3}
              className="w-full rounded-md border px-3 py-2"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
              value={form.description}
              onChange={(e)=>onChange("description", e.target.value)}
              placeholder="Any details that help reviewers"
            />
          </div>
        </div>

        {/* Attachment actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-md border"
            style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            onClick={() => hiddenFile.current?.click()}
            title={hasReceipt ? "Replace receipt" : "Attach receipt"}
          >
            {hasReceipt ? "Replace Receipt" : "Attach Receipt"}
          </button>
          <input
            ref={hiddenFile}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*,application/pdf"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (mustAttach && f.size === 0) { toast("File is empty", { type: "warning" }); return; }
              await handleUpload(f);
            }}
            className="hidden"
          />

          <button
            type="button"
            disabled={!hasReceipt || opening}
            className="px-3 py-1.5 rounded-md border disabled:opacity-60"
            style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            onClick={handleView}
          >
            {opening ? "Opening…" : "View Receipt"}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 rounded-md border"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-md text-white disabled:opacity-60"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        {mustAttach && !hasReceipt && (
          <div className="text-xs mt-3" style={{ color: "var(--destructive)" }}>
            Attachment required by admin — please upload a receipt before resubmitting.
          </div>
        )}
      </div>
    </div>
  );
}
