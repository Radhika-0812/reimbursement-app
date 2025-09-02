// src/pages/HomePage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useClaims } from "../state/ClaimsContext";
import {
  ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { C_NIGHT, C_CHAR, C_CLOUD, C_GUN, C_STEEL } from "../theme/palette";
import { currencyOfClaim, centsFromClaim, formatCents, sumByCurrency } from "../lib/money";

/** Aliases (map to theme vars through palette.js) */
export const C_OFFEE    = C_NIGHT;   // headings / text
export const C_COCOA    = C_GUN;     // primary accents
export const C_TAUPE    = C_CHAR;    // secondary accents
export const C_LINEN    = C_STEEL;   // borders / grid
export const C_EGGSHELL = C_CLOUD;   // soft panels

/** Chart/status colors from theme */
const C_PENDING  = "var(--chart-3)";        // warm (amber/orange)
const C_APPROVED = "var(--chart-1)";        // green
const C_REJECTED = "var(--destructive)";    // red

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Safe date getter */
const getDate = (it) => {
  const raw = it?.date || it?.createdAt || it?.submittedAt || it?.approvedAt || it?.updatedAt || null;
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d : null;
};

/** PURE svg tick (no hooks here) */
const WrappedTick = ({ x, y, payload }) => {
  const parts = String(payload?.value ?? "").split("_");
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fontSize={12} fill={"black"}>
        {parts.map((s, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 0 : 12}>{s}</tspan>
        ))}
      </text>
    </g>
  );
};

export default function HomePage() {
  const { pending: P0 = [], approved: A0 = [], rejected: R0 = [], refresh } = useClaims();

  /** run refresh once (even in StrictMode) */
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    refresh?.().catch(() => {});
  }, [refresh]);

  /** derive options */
  const allDates = useMemo(() => {
    const arr = [...P0, ...A0, ...R0].map(getDate).filter(Boolean).sort((a,b) => a - b);
    return arr;
  }, [P0, A0, R0]);

  const yearOptions = useMemo(() => {
    if (allDates.length === 0) return [new Date().getFullYear()];
    const minY = allDates[0].getFullYear();
    const maxY = allDates[allDates.length - 1].getFullYear();
    const ys = [];
    for (let y = minY; y <= maxY; y++) ys.push(y);
    return ys;
  }, [allDates]);

  const defaultYear = useMemo(() => {
    const cy = new Date().getFullYear();
    return yearOptions.includes(cy) ? cy : yearOptions[0];
  }, [yearOptions]);

  const [year, setYear]   = useState(defaultYear);
  const [month, setMonth] = useState("ALL");

  useEffect(() => {
    setYear(prev => (prev == null ? defaultYear : prev));
  }, [defaultYear]);

  const inSelectedWindow = (it) => {
    const d = getDate(it);
    if (!d) return false;
    if (d.getFullYear() !== Number(year)) return false;
    return month === "ALL" ? true : d.getMonth() === Number(month);
  };

  const P = useMemo(() => P0.filter(inSelectedWindow), [P0, year, month]);
  const A = useMemo(() => A0.filter(inSelectedWindow), [A0, year, month]);
  const R = useMemo(() => R0.filter(inSelectedWindow), [R0, year, month]);
  const ALL = useMemo(() => [...P, ...A, ...R], [P, A, R]);

  const kpiCounts = { pending: P.length, approved: A.length, rejected: R.length };
  const catOf = (it) => String(it?.category ?? it?.claimType ?? "Other");

  const barData = useMemo(() => {
    const m = new Map();
    const add = (list, status) => {
      for (const it of list) {
        const c = catOf(it);
        const row = m.get(c) || { category: c, Pending: 0, Approved: 0, Rejected: 0 };
        row[status]++; m.set(c, row);
      }
    };
    add(P, "Pending"); add(A, "Approved"); add(R, "Rejected");
    return Array.from(m.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [P, A, R]);

  /** Amount helpers (no conversion) */
  const sumsApproved = useMemo(() => sumByCurrency(A), [A]);
  const sumsPending  = useMemo(() => sumByCurrency(P), [P]);

  const hasINR = useMemo(() => ALL.some((c) => currencyOfClaim(c) === "INR"), [ALL]);
  const hasMYR = useMemo(() => ALL.some((c) => currencyOfClaim(c) === "MYR"), [ALL]);

  /** Category table with per-currency sums */
  const tableRows = useMemo(() => {
    const m = new Map();
    const add = (list, key) => {
      for (const it of list) {
        const cat  = catOf(it);
        const code = currencyOfClaim(it);
        const amt  = centsFromClaim(it);

        const row = m.get(cat) || {
          category: cat,
          counts: { Pending: 0, Approved: 0, Rejected: 0 },
          sumsByCurrency: {
            Pending:  { INR: 0, MYR: 0 },
            Approved: { INR: 0, MYR: 0 },
            Rejected: { INR: 0, MYR: 0 },
          },
        };
        row.counts[key] += 1;
        row.sumsByCurrency[key][code] += amt;
        m.set(cat, row);
      }
    };
    add(P, "Pending"); add(A, "Approved"); add(R, "Rejected");

    return Array.from(m.values())
      .map((r) => ({
        ...r,
        counts: {
          ...r.counts,
          Total: r.counts.Pending + r.counts.Approved + r.counts.Rejected,
        },
        sumsByCurrency: {
          ...r.sumsByCurrency,
          Total: {
            INR: r.sumsByCurrency.Pending.INR + r.sumsByCurrency.Approved.INR + r.sumsByCurrency.Rejected.INR,
            MYR: r.sumsByCurrency.Pending.MYR + r.sumsByCurrency.Approved.MYR + r.sumsByCurrency.Rejected.MYR,
          },
        },
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [P, A, R]);

  const totals = useMemo(() => {
    return tableRows.reduce((acc, r) => {
      for (const k of ["Pending", "Approved", "Rejected", "Total"]) {
        acc.counts[k] += r.counts[k];
        acc.sumsByCurrency[k].INR += r.sumsByCurrency[k].INR;
        acc.sumsByCurrency[k].MYR += r.sumsByCurrency[k].MYR;
      }
      return acc;
    }, {
      counts: { Pending: 0, Approved: 0, Rejected: 0, Total: 0 },
      sumsByCurrency: {
        Pending:  { INR: 0, MYR: 0 },
        Approved: { INR: 0, MYR: 0 },
        Rejected: { INR: 0, MYR: 0 },
        Total:    { INR: 0, MYR: 0 },
      },
    });
  }, [tableRows]);

  const windowLabel = useMemo(() => {
    const y = String(year);
    const m = month === "ALL" ? "All months" : MONTH_LABELS[Number(month)];
    return `${y} • ${m}`;
  }, [year, month]);

  const borderCol = "var(--border)";
  const cardBg    = "var(--card)";
  const subtleBg  = "var(--sidebar-accent)";

  return (
    <div className="space-y-6" style={{ color: "var(--foreground)", background: "var(--background)" }}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="rounded-[1rem] border px-3 py-2" style={{ background: cardBg, borderColor: borderCol }}>
            <label className="text-xs mr-2" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>Year</label>
            <select className="bg-transparent text-sm outline-none" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="rounded-[1rem] border px-3 py-2" style={{ background: cardBg, borderColor: borderCol }}>
            <label className="text-xs mr-2" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>Month</label>
            <select className="bg-transparent text-sm outline-none" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="ALL">All</option>
              {MONTH_LABELS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="text-xs -mt-2" style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>{windowLabel}</div>

      {/* KPI row (counts) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-[1.25rem] border p-4" style={{ background: cardBg, borderColor: borderCol }}>
          <div className="text-sm font-bold" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>Pending</div>
          <div className="text-3xl font-bold">{kpiCounts.pending}</div>
        </div>
        <div className="rounded-[1.25rem] border p-4" style={{ background: cardBg, borderColor: borderCol }}>
          <div className="text-sm font-bold" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>Approved</div>
          <div className="text-3xl font-bold">{kpiCounts.approved}</div>
        </div>
        <div className="rounded-[1.25rem] border p-4" style={{ background: cardBg, borderColor: borderCol }}>
          <div className="text-sm font-bold" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>Rejected</div>
          <div className="text-3xl font-bold">{kpiCounts.rejected}</div>
        </div>
      </div>

      {ALL.length === 0 ? (
        <div className="rounded-[1.25rem] border p-6" style={{ background: cardBg, borderColor: borderCol }}>
          <div className="font-medium">No claims for this window.</div>
          <div className="text-sm" style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>Try a different month or year.</div>
        </div>
      ) : (
        <>
          {/* sums + chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4 lg:col-span-1">
              <div className="rounded-[1.25rem] border p-4" style={{ background: cardBg, borderColor: borderCol }}>
                <div className="text-sm mb-1 font-bold" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>
                  Total Reimbursements Request
                </div>
                <div className="text-4xl font-extrabold">{ALL.length}</div>
              </div>

              {/* Amount received (INR/MYR rows) */}
              <div className="rounded-[1.25rem] border p-6" style={{ background: "var(--sidebar-accent)", borderColor: borderCol }}>
                <div className="text-sm mb-2 font-bold" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>
                  Amount received
                </div>
                {hasINR && (
                  <div className="text-lg font-bold"> <span style={{ color: C_APPROVED }}>{formatCents(sumsApproved.INR, "INR")}</span></div>
                )}
                {hasMYR && (
                  <div className="text-lg font-bold"><span style={{ color: C_APPROVED }}>{formatCents(sumsApproved.MYR, "MYR")}</span></div>
                )}
              </div>

              {/* Pending claims (INR/MYR rows) */}
              <div className="rounded-[1.25rem] border p-6" style={{ background: "var(--accent)", borderColor: borderCol }}>
                <div className="text-sm mb-2 font-bold" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>
                  Pending claims
                </div>
                {hasINR && (
                  <div className="text-lg font-extrabold" style={{ color: C_PENDING }}>
                     {formatCents(sumsPending.INR, "INR")}
                  </div>
                )}
                {hasMYR && (
                  <div className="text-lg font-extrabold" style={{ color: C_PENDING }}>
                     {formatCents(sumsPending.MYR, "MYR")}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.25rem] border p-4 lg:col-span-2" style={{ background: cardBg, borderColor: borderCol }}>
              <div className="text-sm mb-2 font-bold" style={{ color: "color-mix(in oklch, var(--foreground) 70%, transparent)" }}>
                Status by category
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklch, var(--border) 70%, transparent)" />
                    <XAxis
                      dataKey="category"
                      tick={WrappedTick}
                      interval={0}
                      height={56}
                      
                      tickMargin={10}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "var(--foreground)" }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={{ fontSize: "12px", borderColor: "var(--border)" }} />
                    <Legend wrapperStyle={{ fontSize: "12px", color: "var(--foreground)" }} />
                    <Bar dataKey="Pending"  stackId="a" fill={C_PENDING}  isAnimationActive={false} />
                    <Bar dataKey="Approved" stackId="a" fill={C_APPROVED} isAnimationActive={false} />
                    <Bar dataKey="Rejected" stackId="a" fill={C_REJECTED} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Category summary table (per-currency amounts shown) */}
          <div className="mt-6 rounded-[1.25rem] border overflow-x-auto" style={{ background: cardBg, borderColor: borderCol }}>
            <div className="px-4 py-3 border-b text-sm font-bold" style={{ background: "var(--sidebar-accent)", borderColor: borderCol }}>
              Category summary
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: "var(--sidebar-accent)" }}>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Pending</th>
                  <th className="px-4 py-2 text-left">Approved</th>
                  <th className="px-4 py-2 text-left">Rejected</th>
                  <th className="px-4 py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.category} className="border-t" style={{ borderColor: borderCol }}>
                    <td className="px-4 py-2 font-medium">{r.category}</td>

                    {["Pending","Approved","Rejected","Total"].map((col) => (
                      <td key={col} className="px-4 py-2 align-top">
                        <div className="font-medium">{r.counts[col]}</div>
                        <div className="text-xs opacity-80">
                          {hasINR && <>{formatCents(r.sumsByCurrency[col].INR, "INR")}</>} 
                          {hasMYR && <> {hasINR ? " • " : ""}{formatCents(r.sumsByCurrency[col].MYR, "MYR")}</>}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold" style={{ background: cardBg, borderColor: borderCol }}>
                  <td className="px-4 py-2">Total</td>

                  {["Pending","Approved","Rejected","Total"].map((col) => (
                    <td key={col} className="px-4 py-2 align-top">
                      <div className="font-medium">{totals.counts[col]}</div>
                      <div className="text-xs opacity-80">
                        {hasINR && <>{formatCents(totals.sumsByCurrency[col].INR, "INR")}</>}
                        {hasMYR && <> {hasINR ? " • " : ""}{formatCents(totals.sumsByCurrency[col].MYR, "MYR")}</>}
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
