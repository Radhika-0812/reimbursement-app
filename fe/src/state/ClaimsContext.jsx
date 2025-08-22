import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as API from "../services/claims";
import { useAuth } from "./AuthContext";

const ClaimsCtx = createContext(null);

// Normalize array or Spring Page payloads
const toList = (p) => (Array.isArray(p) ? p : (p?.content ?? p?.data ?? [])) || [];

export function ClaimsProvider({ children }) {
  const { token } = useAuth();

  const [pending, setPending]   = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  // Derived: closed = approved + rejected
  const closed = useMemo(() => {
    const a = Array.isArray(approved) ? approved : [];
    const r = Array.isArray(rejected) ? rejected : [];
    return [...a, ...r];
  }, [approved, rejected]);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    if (!token) {
      setPending([]); setApproved([]); setRejected([]);
      setLoading(false);
      return;
    }

    try {
      const fetchOrEmpty = async (fn) => {
        if (typeof fn !== "function") return [];
        try {
          const res = await fn();
          return toList(res);
        } catch {
          return [];
        }
      };

      const [p, a, r] = await Promise.all([
        fetchOrEmpty(API.myPending),
        fetchOrEmpty(API.myApproved),
        fetchOrEmpty(API.myRejected),
      ]);

      setPending(p);
      setApproved(a);
      setRejected(r);
    } catch (e) {
      setError(e?.message || "Failed to load claims");
    } finally {
      setLoading(false);
    }
  };

  // expose createBatch so CreateClaim can call it
  const createBatch = async (items) => API.createBatch(items);

  // Fetch on token presence; clear when token disappears
  useEffect(() => {
    if (token) {
      refresh().catch(() => {});
    } else {
      setPending([]); setApproved([]); setRejected([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo(
    () => ({
      pending,
      approved,
      rejected,
      closed,     // <-- derived list
      loading,
      error,
      refresh,
      createBatch,
    }),
    [pending, approved, rejected, closed, loading, error]
  );

  return <ClaimsCtx.Provider value={value}>{children}</ClaimsCtx.Provider>;
}

export const useClaims = () => {
  const ctx = useContext(ClaimsCtx);
  if (!ctx) throw new Error("useClaims must be used within a ClaimsProvider");
  return ctx;
};
