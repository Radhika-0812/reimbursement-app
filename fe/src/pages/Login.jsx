// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { C_NIGHT, C_CHAR, C_CLOUD, C_GUN, C_SLATE, C_STEEL } from "../theme/palette";

/** PALETTE */
export const C_OFFEE    = C_NIGHT;  // strongest text / headings
export const C_COCOA    = C_GUN;    // primary buttons
export const C_TAUPE    = C_CHAR;   // secondary accents
export const C_LINEN    = C_SLATE;  // borders / subtle text
export const C_EGGSHELL = C_STEEL;  // app bg / inputs
export const C_CARD     = C_CLOUD;  // card bg

// Keep this in sync with Footer.jsx
const FOOTER_HEIGHT = 56; // px

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login({
        email: String(form.email || "").trim(),
        password: String(form.password || ""),
      });
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center px-4"
      // 100svh = safe viewport height on mobile (no browser chrome)
      style={{ minHeight: `calc(100svh - ${FOOTER_HEIGHT}px)`, background: C_CLOUD, color: C_OFFEE }}
    >
      {/* placeholder color → coffee */}
      <style>{`input::placeholder { color: ${C_OFFEE}; opacity: 1; }`}</style>

      <div
        className="w-full max-w-md border rounded-2xl shadow p-6"
        style={{ background: C_NIGHT, borderColor: C_LINEN, color: C_CLOUD }}
      >
        <h1 className="text-xl font-semibold" style={{ color: C_CLOUD }}>
          Sign in
        </h1>
        <p className="text-sm mt-1" style={{ color: C_CLOUD }}>
          Use your email and password.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {/* Email */}
          <label className="block text-sm" style={{ color: C_CLOUD }}>
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none"
              style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_NIGHT }}
              placeholder="you@example.com"
            />
          </label>

          {/* Password with eye / eye-off icon */}
          <label className="block text-sm" style={{ color: C_CLOUD }}>
            <span>Password</span>
            <div className="mt-1 relative">
              <input
                type={showPw ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={onChange}
                required
                autoComplete="current-password"
                className="w-full rounded-md border px-3 py-2 pr-10 focus:outline-none"
                style={{ background: C_EGGSHELL, borderColor: C_LINEN, color: C_NIGHT }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                aria-pressed={showPw}
                className="absolute inset-y-0 right-2 my-auto h-8 w-8 grid place-items-center rounded-md focus:outline-none"
                style={{ color: C_OFFEE }}
                title={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
                    <path d="M16.24 16.24A9.47 9.47 0 0 1 12 18c-5 0-9-6-9-6a17.3 17.3 0 0 1 4.46-4.86" />
                    <path d="M9.88 5.12A9.46 9.46 0 0 1 12 6c5 0 9 6 9 6a17.3 17.3 0 0 1-2.16 2.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {err && (
            <div role="alert" className="text-sm" style={{ color: "#b91c1c" }}>
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl text-white py-2 transition-opacity"
            style={{ background: C_COCOA, opacity: busy ? 0.8 : 1 }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
