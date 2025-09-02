// src/lib/money.js

/** Supported currencies (add more here if needed) */
export const CURRENCY_META = {
  INR: { code: "INR", symbol: "₹", word: "Rupees",  locale: "en-IN", prefix: "₹" },
  MYR: { code: "MYR", symbol: "RM", word: "Ringgit", locale: "en-MY", prefix: "RM" },
};

/** Normalize various inputs to our 3-letter code */
export function normalizeCurrency(x) {
  const v = String(x || "").trim().toUpperCase();
  if (v === "RM") return "MYR";
  if (v === "₹")  return "INR";
  return v && CURRENCY_META[v] ? v : "INR";
}

/** Pull the currency code from a claim (no conversion; default INR) */
export function currencyOfClaim(c) {
  return normalizeCurrency(
    c?.currencyCode ?? c?.currency ?? c?.currency_code ?? c?.user?.currencyCode ?? "INR"
  );
}

/** Read the number you save for amount (we treat it as WHOLE units, no /100) */
export function centsFromClaim(c) {
  // Keep name for backward compatibility, but we **do not divide by 100**
  const v = c?.amountCents ?? c?.amount ?? c?.amount_cents ?? c?.total ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Format a whole number using a currency’s locale + symbol (no /100) */
export function formatCents(amountWhole, currencyCode = "INR") {
  const code   = normalizeCurrency(currencyCode);
  const meta   = CURRENCY_META[code] || CURRENCY_META.INR;
  const amount = Number(amountWhole) || 0;
  return `${meta.prefix} ${amount.toLocaleString(meta.locale)}`;
}

/** Format directly from a claim object (or amount + claim) */
export function formatCentsForClaim(aOrClaim, claimMaybe) {
  if (typeof aOrClaim === "object" && aOrClaim) {
    const amt  = centsFromClaim(aOrClaim);
    const code = currencyOfClaim(aOrClaim);
    return formatCents(amt, code);
  }
  const amt  = Number(aOrClaim) || 0;
  const code = currencyOfClaim(claimMaybe);
  return formatCents(amt, code);
}

/** Sums, grouped by currency. Returns { INR: number, MYR: number } */
export function sumByCurrency(list) {
  const totals = { INR: 0, MYR: 0 };
  for (const it of list || []) {
    const code = currencyOfClaim(it);
    const amt  = centsFromClaim(it);
    totals[code] = (totals[code] || 0) + amt;
  }
  // Ensure both keys exist
  totals.INR ||= 0;
  totals.MYR ||= 0;
  return totals;
}

/** Back-compat: old API some pages used. No conversion; just formats using user’s currency if present. */
export function formatCentsForUser(amountWhole, user) {
  const code = normalizeCurrency(user?.currencyCode ?? user?.currency ?? "INR");
  return formatCents(amountWhole, code);
}
