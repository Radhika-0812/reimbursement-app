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

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    setErr("");
    try {
      await login(form);
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

          <label className="block text-sm">
            <span className="text-gray-700">Password</span>
            <div className="mt-1 flex">
              <input
                type={showPw ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={onChange}
                required
                className="w-full rounded-l-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="px-3 border border-l-0 rounded-r-md text-sm text-gray-600 hover:bg-gray-50"
              >
                {showPw ? "Hide" : "Show"}
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

          <div className="text-sm text-center text-gray-600">
            No account?{" "}
            <Link to="/signup" className="text-blue-700 hover:underline">Create one</Link>
          </div>
        </form>

        <div className="mt-6 text-xs text-gray-500">
          Tip: Default admin exists — <b>admin@demo.com / admin123</b>
        </div>
      </div>
    </div>
  );
}
