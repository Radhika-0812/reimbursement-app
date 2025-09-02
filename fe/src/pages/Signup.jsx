// src/pages/Signup.jsx
import React, { useState } from "react";
import { useAuth } from "../state/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = useState({
    name: "",
    department: "",
    contactNo: "",
    address: "",
    pincode: "",
    designation: "",
    email: "",
    password: "",
    // currency: "INR", // default
  });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!form.contactNo?.trim()) {
      setErr("Contact is required");
      return;
    }
    if (!form.password || String(form.password).length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }
    if (!["INR", "MYR"].includes(form.currency)) {
      setErr("Please choose a valid currency (INR or MYR)");
      return;
    }

    try {
      setBusy(true);
      // if your backend expects "contactNo" instead of "contact", change it here.
      await signup({
        name: form.name,
        department: form.department,
        contact: form.contactNo,
        address: form.address,
        designation: form.designation,
        pincode: form.pincode,
        email: form.email,
        password: form.password,
        // currency: form.currency,
      });
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle = {
    background: "var(--input)",
    borderColor: "var(--border)",
    color: "var(--foreground)",
  };

  return (
    <div
      className="space-y-6 mb-10"
      style={{ color: "var(--foreground)", background: "var(--background)" }}
    >
      <h1 className="text-xl sm:text-2xl font-semibold text-center my-4">
        Create Employee
      </h1>

      <div className="max-w-2xl mx-auto">
        <div
          className="w-full border rounded-2xl shadow p-6"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <style>{`input::placeholder, textarea::placeholder { color: var(--muted-foreground); opacity: 1; }`}</style>

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

            {/* Currency dropdown */}
            {/* <CurrencySelect
              value={form.currency}
              onChange={(next) => setForm((s) => ({ ...s, currency: next }))}
            /> */}

            {/* Password */}
            <label className="block text-sm">
              <span>Password</span>
              <div className="mt-1 relative">
                <input
                  type={showPw ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  required
                  minLength={8}
                  className="w-full rounded-md border px-3 py-2 pr-24 focus:outline-none"
                  style={fieldStyle}
                  placeholder="At least 8 characters"
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="px-3 py-1.5 rounded-md border text-xs"
                    style={{
                      background: "var(--sidebar-accent)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </label>

            {err && (
              <div className="text-sm" style={{ color: "var(--destructive)" }}>
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl py-2 transition-opacity"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                opacity: busy ? 0.85 : 1,
              }}
            >
              {busy ? "Creating…" : "Create Employee"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Helpers/Inputs ---------------- */

function CurrencySelect({ value, onChange }) {
  return (
    <label className="block text-sm">
      <span>Currency</span>
      <select
        className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none"
        style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        <option value="INR">India – INR (₹)</option>
        <option value="MYR">Malaysia – MYR (RM)</option>
      </select>
      <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
        This sets the employee’s default currency across the app.
      </div>
    </label>
  );
}

function Input({ label, name, value, onChange, type = "text", required }) {
  return (
    <label className="block text-sm">
      <span>{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none"
        style={{
          background: "var(--input)",
          borderColor: "var(--border)",
          color: "var(--foreground)",
        }}
      />
    </label>
  );
}

function Textarea({ label, name, value, onChange, required }) {
  return (
    <label className="block text-sm">
      <span>{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        required={required}
        className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none"
        style={{
          background: "var(--input)",
          borderColor: "var(--border)",
          color: "var(--foreground)",
        }}
      />
    </label>
  );
}
