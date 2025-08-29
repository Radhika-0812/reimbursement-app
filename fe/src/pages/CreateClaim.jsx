// src/pages/CreateClaim.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useClaims } from "../state/ClaimsContext";
import { useAuth } from "../state/AuthContext";
import toast from "react-hot-toast";

// Palette
import { C_NIGHT, C_CHAR, C_CLOUD, C_GUN, C_SLATE, C_STEEL } from "../theme/palette";
const C_OFFEE = C_NIGHT;   // darkest text
const C_COCOA = C_GUN;     // primary button
const C_TAUPE = C_CHAR;    // secondary accents
const C_LINEN = C_SLATE;   // borders
const C_EGGSHELL = C_STEEL;// input bg
const C_CARD = C_CLOUD;    // card bg

// Keep in sync with backend enum
const CLAIM_TYPES = ["PETROL_ALLOWANCE","CAB_ALLOWANCE","MEAL","OFFICE_SUPPLY","POSTAGE"];

const blankRow = () => ({
  title: "",
  amountCents: "",
  claimType: CLAIM_TYPES[0],
  description: "",
  _file: null,
});

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

  async function authHeaders() {
    let token = null;
    if (auth?.getAccessToken) token = await auth.getAccessToken();
    else if (auth?.token) token = auth.token;
    else token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function uploadReceipt(claimId, file) {
    const fd = new FormData();
    fd.append("file", file);
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/api/claims/${claimId}/receipt`, {
      method: "POST",
      headers,
      body: fd,
    });
    if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Upload failed for claim ${claimId}`);
    return res.json();
  }

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const payload = rows.map((r) => ({
        title: String(r.title || ""),
        amountCents: Math.round(Number(r.amountCents || 0)),
        claimType: String(r.claimType),
        description: r.description ? String(r.description) : undefined,
      }));
      if (!payload.length) throw new Error("Add at least one claim row");

      const created = await createBatch(payload);
      if (!Array.isArray(created)) throw new Error("Create API did not return an array");

      let uploadedCount = 0;
      for (let i = 0; i < created.length; i++) {
        const f = rows[i]._file;
        if (f) { await uploadReceipt(created[i].id, f); uploadedCount++; }
      }

      toast.success(
        uploadedCount > 0
          ? `Created ${created.length} claim(s) and uploaded ${uploadedCount} receipt(s)`
          : `Created ${created.length} claim(s)`
      );
      setRows([blankRow()]);
      navigate("/pending");
    } catch (e) {
      setErr(e.message || "Submit failed");
      toast.error(e.message || "Submit failed");
    } finally { setBusy(false); }
  }

  const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx";

  // Reusable field styles (keeps everything on-palette)
  const fieldStyle = {
    background: C_CLOUD,
    borderColor: C_LINEN,
    color: C_OFFEE,
  };

  return (
    <div className="space-y-6" style={{ color: C_OFFEE }}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold" style={{ color: C_OFFEE }}>
          Create Claim
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm px-3 py-1.5 rounded-xl border"
          style={{ ...fieldStyle }}
        >
          ← Back
        </button>
      </div>

      {/* Card container */}
      <div
        className="rounded-[1.25rem] border p-4 sm:p-6"
        style={{ background: C_GUN, borderColor: C_LINEN }}
      >
        {err && <div className="mb-4 text-sm" style={{ color: "#b91c1c" }}>{err}</div>}

        <div className="space-y-4">
          {rows.map((r, idx) => (
            <div
              key={idx}
              className="rounded-xl border p-4"
              style={{ borderColor: C_LINEN, background: C_CARD }} // ← removed peach
            >
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <label className="block text-sm sm:col-span-2">
                  <span style={{ color: `${C_OFFEE}B3` }}>Title</span>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2"
                    style={fieldStyle}
                    value={r.title}
                    onChange={(e) => update(idx, "title", e.target.value)}
                    placeholder="Cab to office"
                    required
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span style={{ color: `${C_OFFEE}B3` }}>Amount (₹)</span>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2"
                    style={fieldStyle}
                    value={r.amountCents}
                    onChange={(e) => update(idx, "amountCents", e.target.value)}
                    placeholder="550.00"
                    required
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span style={{ color: `${C_OFFEE}B3` }}>Claim Type</span>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2"
                    style={fieldStyle}
                    value={r.claimType}
                    onChange={(e) => update(idx, "claimType", e.target.value)}
                  >
                    {CLAIM_TYPES.map((ct) => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm sm:col-span-6">
                  <span style={{ color: `${C_OFFEE}B3` }}>Description</span>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2"
                    style={fieldStyle}
                    value={r.description}
                    onChange={(e) => update(idx, "description", e.target.value)}
                    placeholder="Airport drop"
                  />
                </label>

                <label className="block text-sm sm:col-span-6">
                  <span style={{ color: `${C_OFFEE}B3` }}>
                    Receipt <span className="opacity-70">(will upload after save)</span>
                  </span>
                  <input
                    type="file"
                    accept={ACCEPT}
                    onChange={(e) => update(idx, "_file", e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm"
                    style={{ color: C_OFFEE }}
                  />
                  {/* file button */}
                  <style>{`
                    input[type="file"]::file-selector-button{
                      background:${C_COCOA};
                      color:${C_EGGSHELL};
                      border:none;
                      padding:.5rem .75rem;
                      border-radius:.5rem;
                      margin-right:.75rem;
                      cursor:pointer;
                    }
                    input[type="file"]::file-selector-button:hover{ opacity:.9; }
                  `}</style>
                  {r._file && (
                    <div className="mt-1 text-xs" style={{ color: "#166534" }}>
                      Attached: <code>{r._file.name}</code> ({Math.round(r._file.size / 1024)} KB)
                    </div>
                  )}
                </label>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="rounded-md border px-3 py-1.5 text-sm"
                  style={{ borderColor: "#fecaca", color: "#b91c1c", background: "#fff1f2" }}
                >
                  Remove row
                </button>
                {idx === rows.length - 1 && (
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-md border px-3 py-1.5 text-sm"
                    style={{ borderColor: C_LINEN, color: C_COCOA, background: C_EGGSHELL }}
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
            className="rounded-xl px-4 py-2 text-white"
            style={{ background: C_COCOA, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "Submitting..." : "Submit"}
          </button>
          <button
            type="button"
            onClick={() => setRows([blankRow()])}
            className="rounded-xl border px-4 py-2"
            style={{ ...fieldStyle }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
