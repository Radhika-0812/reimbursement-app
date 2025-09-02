// src/state/DateFilterContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";

const DateFilterCtx = createContext(null);

export function DateFilterProvider({ children, initialYear, initialMonth = "ALL" }) {
  const today = new Date();
  const defaultYear = initialYear ?? today.getFullYear();

  const [year, setYear] = useState(defaultYear);     // number (e.g., 2025)
  const [month, setMonth] = useState(initialMonth);  // "ALL" | 0..11

  const value = useMemo(() => ({ year, month, setYear, setMonth }), [year, month]);
  return <DateFilterCtx.Provider value={value}>{children}</DateFilterCtx.Provider>;
}

export function useDateFilter() {
  const ctx = useContext(DateFilterCtx);
  if (!ctx) throw new Error("useDateFilter must be used within DateFilterProvider");
  return ctx;
}
