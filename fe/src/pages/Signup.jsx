// src/pages/Signup.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

import { C_NIGHT, C_CHAR, C_CLOUD, C_GUN, C_SLATE, C_STEEL } from "../theme/palette";

/** ─────────────────────────  PALETTE  ───────────────────────── **/
export const C_OFFEE    = C_NIGHT;  // strongest text / headings
export const C_COCOA    = C_GUN;    // primary buttons
export const C_TAUPE    = C_CHAR;   // secondary accents
export const C_LINEN    = C_SLATE;  // borders / subtle text
export const C_EGGSHELL = C_STEEL;  // app bg / inputs
export const C_CARD     = C_CLOUD;  // card bg

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

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
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

    const payload = {
      name: form.name,
      department: form.department,
      contactNo: form.contactNo,
      address: form.address,
      designation: form.designation,
      pincode: form.pincode,
      email: form.email,
      password: form.password,
    };

    try {
      await signup(payload);
      navigate("/admin");
    } catch (err) {
      setErr(err.message || "Signup failed");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-4"
      style={{ background: C_EGGSHELL, color: C_OFFEE }}
    >
      {/* Placeholders match strongest text */}
      <style>{`
        input::placeholder, textarea::placeholder { color: ${C_OFFEE}; opacity: 1; }
      `}</style>

      <div
        className="w-full max-w-2xl border rounded-2xl shadow p-6"
        style={{ background: C_CARD, borderColor: C_LINEN }}
      >
        <h1 className="text-xl font-semibold" style={{ color: C_OFFEE }}>
          Create User
        </h1>
        <p className="text-sm mt-1" style={{ color: C_OFFEE }}>
          Fill in your details to create a user.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <Input label="Full Name" name="name" value={form.name} onChange={onChange} required />
          <Input label="Department" name="department" value={form.department} onChange={onChange} required />
          <Input label="Designation" name="designation" value={form.designation} onChange={onChange} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input type="tel"  label="Contact No" name="contactNo" value={form.contactNo} onChange={onChange} required />
            <Input type="text" label="Pincode"    name="pincode"   value={form.pincode}   onChange={onChange} required />
          </div>

          <Textarea label="Address" name="address" value={form.address} onChange={onChange} required />
          <Input type="email" label="Email ID" name="email" value={form.email} onChange={onChange} required />

          {/* Password */}
          <label className="block text-sm" style={{ color: C_OFFEE }}>
            <span>Password</span>
            <div className="mt-1 flex">
              <input
                type={showPw ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={onChange}
                required
                minLength={8}
                className="w-full rounded-l-md border px-3 py-2 focus:outline-none"
                style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="px-3 border border-l-0 rounded-r-md text-sm"
                style={{ borderColor: C_LINEN, color: C_COCOA, background: C_EGGSHELL }}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {err && (
            <div className="text-sm" style={{ color: "#b91c1c" }}>
              {err}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl text-white py-2"
            style={{ background: C_COCOA }}
          >
            Sign up
          </button>

          <div className="text-sm text-center" style={{ color: C_OFFEE }}>
            Redirect to{" "}
            <Link to="/admin" className="underline" style={{ color: C_COCOA }}>
              Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Reusable inputs with palette */
function Input({ label, name, value, onChange, type = "text", required }) {
  return (
    <label className="block text-sm" style={{ color: C_OFFEE }}>
      <span>{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
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
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        required={required}
        className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none"
        style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_OFFEE }}
      />
    </label>
  );
}
