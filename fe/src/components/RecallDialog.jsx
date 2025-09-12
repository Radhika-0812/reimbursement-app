// src/components/RecallDialog.jsx
import React, { useEffect, useState } from "react";
import { toast } from "../lib/toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://reimbursement-app-7wy3.onrender.com";

function getAuth() {
  const keys = [import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token", "access_token", "token", "jwt"];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  const m = document.cookie.match(/(?:^|; )(?:auth_token|access_token)=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export default function RecallDialog({ open, claim, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [requireAttachment, setRequireAttachment] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setRequireAttachment(false);
      setBusy(false);
    }
  }, [open]);

  if (!open || !claim) return null;

  async function submit() {
    const r = (reason || "").trim();
    if (!r) { toast("Please enter a reason", { type: "warning" }); return; }

    setBusy(true);
    try {
      const token = getAuth();
      const res = await fetch(
        `${API_BASE_URL}/api/admin/claims/${claim.id}/recall`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ reason: r, requireAttachment }), // 👈 backend will ignore if not supported
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(()=>"");
        throw new Error(txt || "Failed to start recall");
      }
      toast("Recall started", { type: "success" });
      onDone?.();
      onClose?.();
    } catch (e) {
      toast(e.message || "Failed to start recall", { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border shadow-xl p-4"
        onClick={(e)=>e.stopPropagation()}
        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
      >
        <div className="text-lg font-semibold">Recall claim #{claim.id}</div>
        <p className="text-sm mt-1" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>
          Tell the user what needs to be fixed or added.
        </p>

        <label className="block text-sm mt-3">
          <span>Reason</span>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border px-3 py-2"
            style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            value={reason}
            onChange={(e)=>setReason(e.target.value)}
            placeholder="e.g., Please upload the restaurant bill photo"
            required
          />
        </label>

        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={requireAttachment} onChange={(e)=>setRequireAttachment(e.target.checked)} />
          Need attachment from user
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border"
            style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-3 py-1.5 rounded-md"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: busy ? 0.8 : 1 }}
            disabled={busy}
          >
            {busy ? "Sending…" : "Start recall"}
          </button>
        </div>
      </div>
    </div>
  );
}
