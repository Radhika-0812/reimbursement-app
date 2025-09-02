// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

/** Keep footer spacing aligned with your footer component */
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
    setErr(""); setBusy(true);
    try {
      await login({ email: String(form.email || "").trim(), password: String(form.password || "") });
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center justify-center px-4"
         style={{ minHeight: `calc(100svh - ${FOOTER_HEIGHT}px)`, background: "var(--background)", color: "var(--foreground)" }}>
      <style>{`input::placeholder { color: var(--muted-foreground); opacity: 1; }`}</style>

      <div className="w-full max-w-md border rounded-2xl shadow p-6"
           style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>Use your email and password.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span>Email</span>
            <input type="email" name="email" value={form.email} onChange={onChange} required autoComplete="email"
                   className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none"
                   style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
                   placeholder="you@example.com" />
          </label>

          <label className="block text-sm">
            <span>Password</span>
            <div className="mt-1 relative">
              <input type={showPw ? "text" : "password"} name="password" value={form.password} onChange={onChange}
                     required autoComplete="current-password"
                     className="w-full rounded-md border px-3 py-2 pr-10 focus:outline-none"
                     style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
                     placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw}
                      className="absolute inset-y-0 right-2 my-auto h-8 w-8 grid place-items-center rounded-md focus:outline-none"
                      style={{ color: "var(--foreground)" }}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          {err && <div role="alert" className="text-sm" style={{ color: "var(--destructive)" }}>{err}</div>}

          <button type="submit" disabled={busy} className="w-full rounded-xl py-2 transition-opacity"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: busy ? 0.8 : 1 }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
