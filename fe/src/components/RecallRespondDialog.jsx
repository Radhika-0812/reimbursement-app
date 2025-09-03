// src/components/RecallRespondDialog.jsx
import React, { useState, useEffect, useRef } from "react";
import { toast } from "../lib/toast";
import { userSendRecallResponse } from "../services/recall";

export default function RecallRespondDialog({ open, claim, requireAttachment, onClose, onDone }) {
  const [comment, setComment] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    if (open) {
      setComment("");
      setFile(null);
      setBusy(false);
      setTimeout(()=>firstRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  async function submit() {
    if (requireAttachment && !file) {
      toast("Attachment required by admin", { type: "warning" }); return;
    }
    setBusy(true);
    try {
      await userSendRecallResponse(claim.id ?? claim.claimId, { comment: comment.trim(), file });
      toast("Response sent", { type: "success" });
      onDone?.();
      onClose?.();
    } catch (e) {
      toast(e.responseText || e.message || "Failed to send response", { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border shadow-xl p-5"
           style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
        <div className="text-lg font-semibold mb-3">Respond to Recall</div>

        <div className="space-y-3">
          <div className="text-sm">
            <div className="mb-1 opacity-70">Comment</div>
            <textarea
              ref={firstRef}
              rows={3}
              className="w-full rounded-md border px-3 py-2"
              style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add clarifications or details for the reviewer"
            />
          </div>

          <div className="text-sm">
            <div className="mb-1 opacity-70">
              Attachment {requireAttachment && <span className="text-red-600">*</span>}
            </div>
            <input type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
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
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
