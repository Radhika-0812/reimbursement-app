import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const LS_USERS = "app_users";
const LS_CURRENT = "app_current_user";

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export function AuthProvider({ children }) {
  // seed one finance & one manager & one admin for easy testing
  const [users, setUsers] = useState(() => {
    const u = read(LS_USERS, null);
    if (u && u.length) return u;
    const seed = [
      { id:"u-admin", role:"admin", email:"admin@demo.com", password:"admin123", firstName:"Admin", lastName:"User" },
      { id:"u-mgr", role:"manager", email:"manager@demo.com", password:"manager123", firstName:"Mila", lastName:"Manager" },
      { id:"u-fin", role:"finance", email:"finance@demo.com", password:"finance123", firstName:"Finn", lastName:"Finance" },
    ];
    write(LS_USERS, seed);
    return seed;
  });
  const [user, setUser] = useState(() => read(LS_CURRENT, null));

  useEffect(() => write(LS_USERS, users), [users]);
  useEffect(() => write(LS_CURRENT, user), [user]);

  const signup = async (form) => {
    const email = form.email.trim().toLowerCase();
    if (users.some(u => u.email === email)) throw new Error("Email already exists.");
    const name = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
    const newUser = { id: crypto.randomUUID(), ...form, email, name };
    setUsers(prev => [newUser, ...prev]);
    // After signup go back to login (do NOT log them in automatically)
    return newUser;
  };

  const login = async ({ email, password }) => {
    email = email.trim().toLowerCase();
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) throw new Error("Invalid email or password.");
    const { password: _pw, ...safe } = found;
    setUser(safe);
    return found;
  };

  const logout = () => setUser(null);

  const value = useMemo(() => ({ user, users, signup, login, logout }), [user, users]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
