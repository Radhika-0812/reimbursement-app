// src/components/RecallRespondDialog.jsx
import React, { useEffect, useState } from "react";
import { toast } from "../lib/toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://reimbursement-app-7wy3.onrender.com";

function getAuth() {
  const keys = [import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token", "access_token", "token"];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  const m = document.cookie.match(/(?:^|; )(?:auth_token|access_token)=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export default function RecallRespondDialog({ open, claim, requireAttachment = false, onClose, onDone }) {
  const [comment, setComment] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setComment("");
      setFile(null);
      setBusy(false);
    }
  }, [open]);

  if (!open || !claim) return null;
  const id = claim.id ?? claim.claimId;

  async function submit() {
    const token = getAuth();
    setBusy(true);
    try {
      // 1) if file provided (or required), upload it to /receipt
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch(`${API_BASE_URL}/api/claims/${id}/receipt`, {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: fd,
          credentials: "include",
        });
        if (!r.ok) {
          const t = await r.text().catch(()=> "");
          throw new Error(t || "Attachment upload failed");
        }
      } else if (requireAttachment) {
        toast("Attachment is required for this recall", { type: "warning" });
        setBusy(false);
        return;
      }

      // 2) resubmit with comment (can be blank)
      const res = await fetch(`${API_BASE_URL}/api/claims/${id}/resubmit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ comment }),
        credentials: "include",
      });
      if (!res.ok) {
        const t = await res.text().catch(()=> "");
        throw new Error(t || "Resubmit failed");
      }

      toast("Response sent to admin", { type: "success" });
      onDone?.();
      onClose?.();
    } catch (e) {
      toast(e.message || "Could not send response", { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[140] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border shadow-xl p-4"
        onClick={(e)=>e.stopPropagation()}
        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
      >
        <div className="text-lg font-semibold">Respond to recall</div>
        <p className="text-sm mt-1" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>
          {requireAttachment ? "An attachment is required. " : ""}Add any notes for the admin and (optionally) attach a file.
        </p>

        <label className="block text-sm mt-3">
          <span>Comment (optional)</span>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border px-3 py-2"
            style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            value={comment}
            onChange={(e)=>setComment(e.target.value)}
            placeholder="e.g., Uploaded the invoice; added GST breakdown"
          />
        </label>

        <label className="block text-sm mt-3">
          <span>Attachment {requireAttachment ? "(required)" : "(optional)"}</span>
          <input
            type="file"
            onChange={(e)=>setFile(e.target.files?.[0] || null)}
            className="block w-full mt-1 text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*,application/pdf"
          />
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
            {busy ? "Submitting…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
