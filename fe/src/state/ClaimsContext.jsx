import React, { createContext, useContext, useMemo, useReducer } from "react";

const ClaimsContext = createContext(null);

/* Workflow:
 pending_manager --(manager approve w/ comment)--> pending_finance
 pending_finance --(finance approve w/ comment)--> closed
 Any stage reject w/ comment ---------------------> rejected
*/
const initialState = { claims: [] };
// claim: { id, userId, managerId, category, amount, payload, createdAt, status, history: [{at, by, role, action, comment}] }

function reducer(state, action) {
  switch (action.type) {
    case "CREATE_CLAIM": {
      const { userId, managerId, category, amount, payload } = action.payload;
      const newClaim = {
        id: crypto.randomUUID(),
        userId, managerId: managerId || null, category, amount, payload,
        createdAt: new Date().toISOString(),
        status: "pending_manager",
        history: [],
      };
      return { ...state, claims: [newClaim, ...state.claims] };
    }
    case "MANAGER_DECIDE": {
      const { id, actorId, comment, approve } = action.payload;
      return {
        ...state,
        claims: state.claims.map(c => {
          if (c.id !== id || c.status !== "pending_manager" || c.managerId !== actorId) return c;
          const next = approve ? "pending_finance" : "rejected";
          return {
            ...c,
            status: next,
            history: [...c.history, { at: new Date().toISOString(), by: actorId, role: "manager", action: approve ? "approved" : "rejected", comment }],
          };
        }),
      };
    }
    case "FINANCE_DECIDE": {
      const { id, actorId, comment, approve } = action.payload;
      return {
        ...state,
        claims: state.claims.map(c => {
          if (c.id !== id || c.status !== "pending_finance") return c;
          const next = approve ? "closed" : "rejected";
          return {
            ...c,
            status: next,
            history: [...c.history, { at: new Date().toISOString(), by: actorId, role: "finance", action: approve ? "approved" : "rejected", comment }],
          };
        }),
      };
    }
    default:
      return state;
  }
}

export function ClaimsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const createClaim = (payload) => dispatch({ type: "CREATE_CLAIM", payload });
  const managerDecide = ({ id, actorId, comment, approve }) => dispatch({ type: "MANAGER_DECIDE", payload: { id, actorId, comment, approve } });
  const financeDecide = ({ id, actorId, comment, approve }) => dispatch({ type: "FINANCE_DECIDE", payload: { id, actorId, comment, approve } });

  const value = useMemo(() => ({ ...state, createClaim, managerDecide, financeDecide }), [state]);
  return <ClaimsContext.Provider value={value}>{children}</ClaimsContext.Provider>;
}

export function useClaims() {
  const ctx = useContext(ClaimsContext);
  if (!ctx) throw new Error("useClaims must be used within ClaimsProvider");
  return ctx;
}
