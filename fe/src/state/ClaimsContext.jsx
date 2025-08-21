import React, { createContext, useContext, useState, useEffect } from "react";
import * as API from "../services/claims";
import { useAuth } from "./AuthContext";

const ClaimsCtx = createContext(null);

export function ClaimsProvider({ children }) {
  const { token } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const p = await API.myPending();
      const list = Array.isArray(p) ? p : (p?.content ?? p?.data ?? []);
      setPending(list);
    } finally {
      setLoading(false);
    }
  };

  // expose createBatch so CreateClaim can call it
  const createBatch = async (items) => API.createBatch(items);

  // fetch when we have a token; clear when we don't
  useEffect(() => {
    if (token) {
      refresh().catch(() => {});
    } else {
      setPending([]);
    }
  }, [token]);

  return (
    <ClaimsCtx.Provider value={{ pending, loading, refresh, createBatch }}>
      {children}
    </ClaimsCtx.Provider>
  );
}

export const useClaims = () => useContext(ClaimsCtx);
