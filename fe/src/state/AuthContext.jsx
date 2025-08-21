import React, { createContext, useContext, useMemo, useState } from "react";
import * as Auth from "../services/auth";

const AuthCtx = createContext(null);

// robust JWT payload decode (handles base64url)
function decodeJwt(t) {
  try {
    const base = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base));
  } catch {
    return null;
  }
}

function buildUserFromToken(t, fallbackEmail) {
  const p = decodeJwt(t);
  if (!p) return null;

  // roles -> array of "ROLE_*"
  let roles = [];
  if (Array.isArray(p.authorities)) roles = p.authorities;
  else if (Array.isArray(p.roles)) roles = p.roles;
  else if (p.role) roles = [p.role];

  roles = roles.map(r => (r.startsWith("ROLE_") ? r : `ROLE_${r}`));
  const primaryRole = (roles[0] || "ROLE_USER").replace(/^ROLE_/, ""); // "USER" / "ADMIN"

  return {
    id: p.uid ?? p.userId ?? p.id ?? null,         // <-- needed for filtering
    email: p.sub || p.email || fallbackEmail || "",
    roles,                                         // e.g. ["ROLE_USER"]
    role: primaryRole,                             // e.g. "USER"
    raw: p,
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem("token");
    return t ? buildUserFromToken(t) : null;
  });

  const login = async ({ email, password }) => {
    const res = await Auth.signin({ email, password });
    const jwt = typeof res === "string" ? res : (res.accessToken || res.token || res.jwt || "");
    if (!jwt) throw new Error("No token in response");

    localStorage.setItem("token", jwt);
    setToken(jwt);
    setUser(buildUserFromToken(jwt, email));
  };

  const signup = async (body) => {
    await Auth.signup(body);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
  };

  const hasRole = (r) => {
    if (!user?.roles) return false;
    const want = r.startsWith("ROLE_") ? r : `ROLE_${r}`;
    return user.roles.includes(want);
  };

  const value = useMemo(
    () => ({ token, user, isAuthed: !!token, login, signup, logout, hasRole }),
    [token, user]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
