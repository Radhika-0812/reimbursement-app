// src/pages/CreateClaim.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useClaims } from "../state/ClaimsContext";
import { useAuth } from "../state/AuthContext";       // <-- to get JWT
import toast from "react-hot-toast";

// Keep in sync with backend enum com.rms.reimbursement_app.domain.ClaimType
const CLAIM_TYPES = [
  "PETROL_ALLOWANCE",
  "CAB_ALLOWANCE",
  "MEAL",
  "OFFICE_SUPPLY",
  "POSTAGE",
];

function blankRow() {
  return {
    title: "",
    amountCents: "",          // UI shows ₹; we convert to cents on submit
    claimType: CLAIM_TYPES[0],
    description: "",
    _file: null,              // local only; uploaded after the claim is created
  };
}

export default function CreateClaim() {
  const navigate = useNavigate();
  const { createBatch } = useClaims();
  const auth = useAuth();

  const [rows, setRows] = React.useState([blankRow()]);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

  const update = (idx, key, val) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));

  const addRow = () => setRows((r) => [...r, blankRow()]);
  const removeRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));

  // Try to get Authorization header from AuthContext; fallback to localStorage if needed
  async function authHeaders() {
    let token = null;
    if (auth?.getAccessToken) token = await auth.getAccessToken();
    else if (auth?.token) token = auth.token;
    else token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Upload one file to /api/claims/{id}/receipt (multipart/form-data)
  async function uploadReceipt(claimId, file) {
    const fd = new FormData();
    fd.append("file", file);
    const headers = await authHeaders(); // Authorization only; don't set Content-Type manually
    const res = await fetch(`${API_BASE}/api/claims/${claimId}/receipt`, {
      method: "POST",
      headers,
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Upload failed for claim ${claimId}`);
    }
    return res.json(); // { claimId, filename, contentType, size }
  }

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      // Build payload for createBatch (convert ₹ to cents)
      const payload = rows.map((r) => ({
        title: String(r.title || ""),
        amountCents: Math.round(Number(r.amountCents || 0)  ), // ₹ -> cents
        claimType: String(r.claimType),
        description: r.description ? String(r.description) : undefined,
        // receiptUrl removed; we now upload file AFTER create
      }));
      if (!payload.length) throw new Error("Add at least one claim row");

      // 1) Create the claims
      const created = await createBatch(payload); // expects array of ClaimResponse { id, ... }
      if (!Array.isArray(created)) {
        throw new Error("Create API did not return an array");
      }
      if (created.length !== rows.length) {
        // We assume the backend returns one created claim per row in the same order.
        // If not, you can map by title or show a warning.
        console.warn("Row/response count mismatch. Uploads will map by index.");
      }

      // 2) Upload receipts for rows that have a file
      let uploadedCount = 0;
      for (let i = 0; i < created.length; i++) {
        const claim = created[i];
        const file = rows[i]._file;
        if (file) {
          await uploadReceipt(claim.id, file);
          uploadedCount++;
        }
      }

      toast.success(
        uploadedCount > 0
          ? `Created ${created.length} claim(s) and uploaded ${uploadedCount} receipt(s)`
          : `Created ${created.length} claim(s)`
      );
      setRows([blankRow()]);
      navigate("/pending");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Submit failed");
      toast.error(e.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  // Local file validation (optional, keep in sync with backend allowlist)
  const ACCEPT =
    ".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold text-blue-950">Create Claim</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm px-3 py-1.5 rounded-md border text-blue-950 border-blue-200 hover:bg-blue-50"
        >
          ← Back
        </button>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        {err && <div className="mb-4 text-sm text-red-600">{err}</div>}

        <div className="space-y-4">
          {rows.map((r, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <label className="block text-sm sm:col-span-2">
                  <span className="text-gray-700">Title</span>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={r.title}
                    onChange={(e) => update(idx, "title", e.target.value)}
                    placeholder="Cab to office"
                    required
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="text-gray-700">Amount (₹)</span>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={r.amountCents}
                    onChange={(e) => update(idx, "amountCents", e.target.value)}
                    placeholder="550.00"
                    required
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="text-gray-700">Claim Type</span>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={r.claimType}
                    onChange={(e) => update(idx, "claimType", e.target.value)}
                  >
                    {CLAIM_TYPES.map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm sm:col-span-6">
                  <span className="text-gray-700">Description</span>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={r.description}
                    onChange={(e) => update(idx, "description", e.target.value)}
                    placeholder="Airport drop"
                  />
                </label>

                <label className="block text-sm sm:col-span-6">
                  <span className="text-gray-700">Receipt (will upload after save)</span>
                  <input
                    type="file"
                    accept={ACCEPT}
                    onChange={(e) => update(idx, "_file", e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-900 hover:file:bg-blue-100"
                  />
                  {r._file && (
                    <div className="mt-1 text-xs text-green-700">
                      Attached: <code>{r._file.name}</code> ({Math.round(r._file.size / 1024)} KB)
                    </div>
                  )}
                </label>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="rounded-md border px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50"
                >
                  Remove row
                </button>
                {idx === rows.length - 1 && (
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-md border px-3 py-1.5 text-sm text-blue-900 hover:bg-blue-50"
                  >
                    + Add row
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-md bg-blue-950 px-4 py-2 text-white hover:bg-blue-900 disabled:opacity-60"
          >
            {busy ? "Submitting..." : "Submit"}
          </button>
          <button
            type="button"
            onClick={() => setRows([blankRow()])}
            className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
