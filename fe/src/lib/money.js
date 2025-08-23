
export function centsFromClaim(c) {
    if (c?.amountCents != null) return Number(c.amountCents);
    if (c?.amount != null) return Math.round(Number(c.amount) * 100);
    if (c?.amountRupees != null) return Math.round(Number(c.amountRupees) * 100);
    return 0;
  }
  
  // Format an integer with Indian digit grouping, no currency symbol.
  export function formatCents(n) {
    return Number(n || 0).toLocaleString("en-IN");
  }
  
  
  