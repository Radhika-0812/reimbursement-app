// src/pages/Signup.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { C_NIGHT, C_CHAR, C_CLOUD, C_GUN, C_SLATE, C_STEEL } from "../theme/palette";

export const C_OFFEE = C_NIGHT;
export const C_COCOA = C_GUN;
export const C_TAUPE = C_CHAR;
export const C_LINEN = C_SLATE;
export const C_EGGSHELL = C_STEEL;
export const C_CARD = C_CLOUD;

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", department: "", contactNo: "",
    address: "", pincode: "", designation: "",
    email: "", password: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!form.contactNo?.trim()) { setErr("Contact is required"); return; }
    if (!form.password || String(form.password).length < 8) {
      setErr("Password must be at least 8 characters"); return;
    }
    try {
      setBusy(true);
      await signup({
        name: form.name, department: form.department, contactNo: form.contactNo,
        address: form.address, designation: form.designation, pincode: form.pincode,
        email: form.email, password: form.password,
      });
      navigate("/admin", { replace: true });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6 mb-10" style={{ color: C_OFFEE }}>
      <h1 className="text-xl sm:text-2xl font-semibold text-center my-4">Create Employee</h1>

      {/* centered form */}
      <div className="max-w-2xl mx-auto">
        <div className="w-full border rounded-2xl shadow p-6"
             style={{ background: C_CARD, borderColor: C_LINEN }}>
          <style>{`input::placeholder, textarea::placeholder { color: ${C_OFFEE}; opacity: 1; }`}</style>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Full Name" name="name" value={form.name} onChange={onChange} required />
            <Input label="Department" name="department" value={form.department} onChange={onChange} required />
            <Input label="Designation" name="designation" value={form.designation} onChange={onChange} required />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input type="tel" label="Contact No" name="contactNo" value={form.contactNo} onChange={onChange} required />
              <Input type="text" label="Pincode" name="pincode" value={form.pincode} onChange={onChange} required />
            </div>

            <Textarea label="Address" name="address" value={form.address} onChange={onChange} required />
            <Input type="email" label="Email ID" name="email" value={form.email} onChange={onChange} required />

            <label className="block text-sm" style={{ color: C_OFFEE }}>
              <span>Password</span>
              <div className="mt-1 relative">
                <input
                  type={showPw ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  required minLength={8}
                  className="w-full rounded-md border px-3 py-2 pr-24 focus:outline-none"
                  style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
                  placeholder="At least 8 characters"
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="px-3 py-1.5 rounded-md border text-xs"
                    style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </label>

            {err && <div className="text-sm" style={{ color: "#b91c1c" }}>{err}</div>}

            <button type="submit" disabled={busy}
                    className="w-full rounded-xl text-white py-2 transition-opacity"
                    style={{ background: C_COCOA, opacity: busy ? 0.85 : 1 }}>
              {busy ? "Creating…" : "Create Employee"}
            </button>

            {/* <div className="text-sm text-center" style={{ color: C_OFFEE }}>
              Back to <Link to="/admin" className="underline" style={{ color: C_COCOA }}>Admin</Link>
            </div> */}
          </form>
        </div>
      </div>
    </div>
  );
}

function Input({ label, name, value, onChange, type = "text", required }) {
  return (
    <label className="block text-sm" style={{ color: C_OFFEE }}>
      <span>{label}</span>
      <input
        type={type} name={name} value={value} onChange={onChange} required={required}
        className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none"
        style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
      />
    </label>
  );
}
function Textarea({ label, name, value, onChange, required }) {
  return (
    <label className="block text-sm" style={{ color: C_OFFEE }}>
      <span>{label}</span>
      <textarea
        name={name} value={value} onChange={onChange} rows={3} required={required}
        className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none"
        style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
      />
    </label>
  );
}
