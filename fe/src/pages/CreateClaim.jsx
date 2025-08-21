import React from "react";
import { useNavigate } from "react-router-dom";
import { useClaims } from "../state/ClaimsContext";
import NavBar from "../components/NavBar";
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
    amountCents: "",
    claimType: CLAIM_TYPES[0],
    description: "",
    receiptUrl: "",
    _file: null, // local only
  };
}

export default function CreateClaim() {
  const navigate = useNavigate();
  const { createBatch } = useClaims();
  const [rows, setRows] = React.useState([blankRow()]);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const update = (idx, key, val) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));

  const addRow = () => setRows((r) => [...r, blankRow()]);
  const removeRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));

  async function getPresignedUrl(file) {
    const res = await fetch(`${import.meta.env.VITE_API_BASE.replace(/\/$/, "")}/api/files/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // { url, key }
  }

  async function uploadToS3(url, file) {
    const res = await fetch(url, { method: "PUT", body: file });
    if (!res.ok) throw new Error("S3 upload failed");
  }

  async function attachFile(idx, file) {
    if (!file) return;
    setErr("");
    try {
      const { url, key } = await getPresignedUrl(file);
      await uploadToS3(url, file);
      update(idx, "receiptUrl", `s3://${key}`);
      update(idx, "_file", file); // keep for UI feedback
    } catch (e) {
      setErr(e.message || "File upload failed");
    }
  }

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      const payload = rows.map((r) => ({
        title: String(r.title || ""),
        amountCents: Math.round(Number(r.amountCents || 0)),
        claimType: String(r.claimType),
        description: r.description ? String(r.description) : undefined,
        receiptUrl: r.receiptUrl || undefined,
      }));
      if (!payload.length) throw new Error("Add at least one claim row");
      await createBatch(payload);
      setRows([blankRow()]);
      toast.success("Claim created successfully");
      navigate("/pending");
    } catch (e) {
      setErr(e.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
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
                  <span className="text-gray-700">Receipt (S3)</span>
                  <input
                    type="file"
                    onChange={(e) => attachFile(idx, e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-900 hover:file:bg-blue-100"
                  />
                  {r.receiptUrl && (
                    <div className="mt-1 text-xs text-green-700">
                      Attached: <code>{r.receiptUrl}</code>
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
    </div>
  );
}
