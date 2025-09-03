// src/components/RecallDialog.jsx
import React, { useState, useEffect, useRef } from "react";
import { toast } from "../lib/toast";
import { adminRecallClaim, adminUploadRecallAttachment } from "../services/recall";

export default function RecallDialog({ open, claim, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [needAttach, setNeedAttach] = useState(true);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setNeedAttach(true);
      setFile(null);
      setBusy(false);
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  async function submit() {
    const r = (reason || "").trim();
    if (!r) { toast("Please enter a reason for recall", { type: "warning" }); return; }
    setBusy(true);
    try {
      await adminRecallClaim(claim.id ?? claim.claimId, { reason: r, requireAttachment: !!needAttach });
      if (file) await adminUploadRecallAttachment(claim.id ?? claim.claimId, file);
      toast("Recall requested", { type: "success" });
      onDone?.();
      onClose?.();
    } catch (e) {
      toast(e.responseText || e.message || "Recall failed", { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border shadow-xl p-5"
           style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
        <div className="text-lg font-semibold mb-3">Recall Claim</div>

        <div className="space-y-3">
          <div className="text-sm">
            <div className="mb-1 opacity-70">Reason</div>
            <textarea
              ref={firstRef}
              rows={3}
              className="w-full rounded-md border px-3 py-2"
              style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain what additional information/changes are required"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={needAttach} onChange={(e)=>setNeedAttach(e.target.checked)} />
            Require user to attach a file in the response
          </label>

          <div className="text-sm">
            <div className="mb-1 opacity-70">Admin attachment (optional)</div>
            <input type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
            <div className="text-xs mt-1 opacity-70">Use this to attach an example/spec for the user.</div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded border"
                  style={{ background: "var(--sidebar-accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="px-3 py-1.5 rounded"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Recall"}
          </button>
        </div>
      </div>
    </div>
  );
}
