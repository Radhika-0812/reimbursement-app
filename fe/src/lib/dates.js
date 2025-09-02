// src/lib/dates.js
export const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const getDateFromClaim = (it) => {
  const raw = it?.date || it?.createdAt || it?.submittedAt || it?.approvedAt || it?.updatedAt || null;
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d : null;
};

export const inYearMonth = (year, month /* "ALL"|0..11 */) => (it) => {
  const d = getDateFromClaim(it);
  if (!d) return false;
  const y = d.getFullYear();
  const m = d.getMonth();
  if (y !== Number(year)) return false;
  return month === "ALL" ? true : m === Number(month);
};
