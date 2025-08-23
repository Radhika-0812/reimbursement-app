// src/pages/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    const payload = {
      email: String(form.email || "").trim(),
      password: String(form.password || ""),
    };

    if (import.meta.env.DEV) {
      console.groupCollapsed("[Login] submit payload");
      console.log("email:", payload.email);
      console.log("password:", "•".repeat(payload.password.length), `(${payload.password.length} chars)`);
      console.groupEnd();
    }

    try {
      await login(payload);
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border rounded-2xl shadow p-6">
        <h1 className="text-xl font-semibold text-blue-950">Sign in</h1>
        <p className="text-sm text-gray-500 mt-1">Use your email and password.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {/* Email */}
          <label className="block text-sm">
            <span className="text-gray-700">Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="you@example.com"
            />
          </label>

          {/* Password with eye / eye-off icon */}
          <label className="block text-sm">
            <span className="text-gray-700">Password</span>
            <div className="mt-1 relative">
              <input
                type={showPw ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={onChange}
                required
                className="w-full rounded-md border px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                aria-pressed={showPw}
                className="absolute inset-y-0 right-2 my-auto h-8 w-8 grid place-items-center rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {showPw ? (
                  // Eye-off icon
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
                    <path d="M16.24 16.24A9.47 9.47 0 0 1 12 18c-5 0-9-6-9-6a17.3 17.3 0 0 1 4.46-4.86" />
                    <path d="M9.88 5.12A9.46 9.46 0 0 1 12 6c5 0 9 6 9 6a17.3 17.3 0 0 1-2.16 2.88" />
                  </svg>
                ) : (
                  // Eye icon
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button
            type="submit"
            className="w-full rounded-md bg-blue-950 text-white py-2 hover:bg-blue-900"
          >
            Sign in
          </button>

          {/* If you enable signup later:
          <div className="text-sm text-center text-gray-600">
            No account?{" "}
            <Link to="/signup" className="text-blue-700 hover:underline">Create one</Link>
          </div> */}
        </form>
      </div>
    </div>
  );
}
