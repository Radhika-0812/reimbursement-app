// src/state/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { tokenStore, inject401Handler } from "../lib/api";

const AuthContext = createContext(null);
const LS_CURRENT = "app_current_user";

const read = (k, d) => {
  try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); }
  catch { return d; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => read(LS_CURRENT, null));
  const [loading, setLoading] = useState(true);

  // global 401 → logout
  useEffect(() => {
    inject401Handler(() => {
      tokenStore.set(null);
      setUser(null);
      write(LS_CURRENT, null);
    });
  }, []);

  // hydrate current user if token/cookie available
  useEffect(() => {
    (async () => {
      try {
        const hasToken = !!tokenStore.get();
        if (hasToken || api.defaults.withCredentials) {
          const { data } = await api.get("/api/auth/me");
          setUser(data || null);
          write(LS_CURRENT, data || null);
        }
      } catch {
        tokenStore.set(null);
        setUser(null);
        write(LS_CURRENT, null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Map FE → BE exactly to your SignUpReq DTO
  const signup = async (form) => {
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      dob: form.dob,                 // "YYYY-MM-DD"
      doj: form.doj,                 // "YYYY-MM-DD"
      department: form.department,
      manager: form.manager,         // string
      role: form.role,
      contactNo: form.contact ?? form.contactNo, // 10 digits
      address: form.address,
      pincode: form.pincode,         // 6 digits
      email: form.email,
      password: form.password,       // 8–64 chars
    };
    await api.post("/api/auth/signup", payload);
    return true; // caller can navigate to /login
  };

  const login = async ({ email, password }) => {
    // BE endpoint is /signin (not /login)
    const { data } = await api.post("/api/auth/login", { email, password });

    if (data?.token) tokenStore.set(data.token);

    // Prefer user from signin response; fallback to /me
    let nextUser = data?.user ?? null;
    if (!nextUser) {
      try {
        const me = await api.get("/api/auth/me");
        nextUser = me.data ?? null;
      } catch { /* ignore */ }
    }

    setUser(nextUser);
    write(LS_CURRENT, nextUser);
    return nextUser;
  };

  const logout = async () => {
    try { await api.post("/api/auth/logout"); } catch {}
    tokenStore.set(null);
    setUser(null);
    write(LS_CURRENT, null);
  };

  const value = useMemo(() => ({ user, loading, signup, login, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
