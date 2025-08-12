import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "./AuthContext";

const ClaimsContext = createContext(null);

export function ClaimsProvider({ children }) {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchClaims = async () => {
    if (!user) { setClaims([]); return; }
    setLoading(true);
    try {
      // Option A: single endpoint with server-side filtering by role
      const { data } = await api.get("/api/claims");
      setClaims(data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClaims(); /* eslint-disable-next-line */ }, [user?.id, user?.role]);

  const createClaim = async (payload) => {
    const { data } = await api.post("/api/claims", payload);
    // optimistic update
    setClaims(prev => [data, ...prev]);
  };

  const managerDecide = async ({ id, approve, comment }) => {
    const { data } = await api.post(`/api/claims/${id}/manager-decision`, { approve, comment });
    setClaims(prev => prev.map(c => (c.id === id ? data : c)));
  };

  const financeDecide = async ({ id, approve, comment }) => {
    const { data } = await api.post(`/api/claims/${id}/finance-decision`, { approve, comment });
    setClaims(prev => prev.map(c => (c.id === id ? data : c)));
  };

  const value = useMemo(() => ({
    claims, loading, fetchClaims, createClaim, managerDecide, financeDecide
  }), [claims, loading]);

  return <ClaimsContext.Provider value={value}>{children}</ClaimsContext.Provider>;
}

export function useClaims() {
  const ctx = useContext(ClaimsContext);
  if (!ctx) throw new Error("useClaims must be used within ClaimsProvider");
  return ctx;
}
