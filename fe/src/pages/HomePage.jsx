// src/pages/HomePage.jsx
import React, { useEffect, useMemo } from "react";
import { useClaims } from "../state/ClaimsContext";
import {
  ResponsiveContainer,
  Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  C_NIGHT, C_CHAR, C_CLOUD, C_GUN, C_SLATE, C_STEEL, C_CARD
} from "../theme/palette";
import { centsFromClaim, formatCents } from "../lib/money";

/** Palette aliases for readability (mapped to your green theme) */
export const C_OFFEE    = C_NIGHT;   // darkest text / headings
export const C_COCOA    = C_GUN;     // primary accents
export const C_TAUPE    = C_CHAR;    // secondary accents
export const C_LINEN    = C_STEEL;   // borders / grid (mint)
export const C_EGGSHELL = C_CLOUD;   // eggshell / light panels

// Status colors (kept tasteful for contrast)
const C_RED    = "#ef4444";
const C_ORANGE = "#f59e0b";
const C_GREEN  = "#16a34a";

/** Wrapped X tick (split by "_") */
const WrappedTick = ({ x, y, payload }) => {
  const parts = String(payload?.value ?? "").split("_");
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fontSize={12} fill={C_OFFEE}>
        {parts.map((s, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 0 : 12}>{s}</tspan>
        ))}
      </text>
    </g>
  );
};

export default function HomePage() {
  const { pending = [], approved = [], rejected = [], refresh } = useClaims();
  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  const P = Array.isArray(pending) ? pending : [];
  const A = Array.isArray(approved) ? approved : [];
  const R = Array.isArray(rejected) ? rejected : [];
  const ALL = useMemo(() => [...P, ...A, ...R], [P, A, R]);

  const kpi = { pending: P.length, approved: A.length, rejected: R.length };
  const catOf = (it) => String(it?.category ?? it?.claimType ?? "Other");

  const barData = useMemo(() => {
    const m = new Map();
    const add = (list, status) => {
      for (const it of list) {
        const c = catOf(it);
        const row = m.get(c) || { category: c, Pending: 0, Approved: 0, Rejected: 0 };
        row[status]++;
        m.set(c, row);
      }
    };
    add(P, "Pending");
    add(A, "Approved");
    add(R, "Rejected");
    return Array.from(m.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [P, A, R]);

  // ---- Table (counts + sums in cents) ----
  const getAmt = (it) => centsFromClaim(it);
  const fmt    = (n)  => formatCents(n);

  const tableRows = useMemo(() => {
    const m = new Map();
    const add = (list, key) => {
      for (const it of list) {
        const c = catOf(it);
        const amt = getAmt(it);
        const row = m.get(c) || {
          category: c,
          counts: { Pending: 0, Approved: 0, Rejected: 0 },
          sums:   { Pending: 0, Approved: 0, Rejected: 0 },
        };
        row.counts[key] += 1;
        row.sums[key]   += amt;
        m.set(c, row);
      }
    };
    add(P, "Pending"); add(A, "Approved"); add(R, "Rejected");

    return Array.from(m.values())
      .map((r) => ({
        ...r,
        counts: { ...r.counts, Total: r.counts.Pending + r.counts.Approved + r.counts.Rejected },
        sums:   { ...r.sums,   Total: r.sums.Pending   + r.sums.Approved   + r.sums.Rejected },
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [P, A, R]);

  const totals = useMemo(() => {
    return tableRows.reduce((acc, r) => {
      for (const k of ["Pending", "Approved", "Rejected", "Total"]) {
        acc.counts[k] += r.counts[k];
        acc.sums[k]   += r.sums[k];
      }
      return acc;
    }, { counts: { Pending: 0, Approved: 0, Rejected: 0, Total: 0 },
         sums:   { Pending: 0, Approved: 0, Rejected: 0, Total: 0 } });
  }, [tableRows]);

  const approvedSum = useMemo(() => A.reduce((s, it) => s + getAmt(it), 0), [A]);
  const hasData = ALL.length > 0;

  return (
    <div className="space-y-6" style={{ color: C_OFFEE, background:"#F5F0E6" }}>
      <h1 className="text-2xl font-semibold mb-5" style={{ color: C_OFFEE }}>Dashboard</h1>

      {/* ===== ROW 1: KPI cards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-[1.25rem] border p-4" style={{ background: C_CLOUD, borderColor: C_NIGHT }}>
          <div className="text-sm font-bold" style={{ color: `${C_OFFEE}B3` }}>Pending</div>
          <div className="text-3xl font-bold" style={{ color: C_OFFEE }}>{kpi.pending}</div>
        </div>
        <div className="rounded-[1.25rem] border p-4" style={{ background: C_CLOUD, borderColor: C_NIGHT }}>
          <div className="text-sm font-bold" style={{ color: `${C_OFFEE}B3` }}>Approved</div>
          <div className="text-3xl font-bold" style={{ color: C_OFFEE }}>{kpi.approved}</div>
        </div>
        <div className="rounded-[1.25rem] border p-4" style={{background: C_CLOUD, borderColor: C_NIGHT }}>
          <div className="text-sm font-bold" style={{ color: `${C_OFFEE}B3` }}>Rejected</div>
          <div className="text-3xl font-bold" style={{ color: C_OFFEE }}>{kpi.rejected}</div>
        </div>
      </div>

      {!hasData && (
        <div className="rounded-[1.25rem] border p-6" style={{ background: C_CLOUD, borderColor: C_NIGHT }}>
          <div className="font-medium" style={{ color: C_OFFEE }}>No claims yet.</div>
          <div className="text-sm" style={{ color: `${C_OFFEE}99` }}>Create claims to see charts here.</div>
        </div>
      )}

      {hasData && (
        <>
          {/* ===== ROW 2: KPI sums + Chart ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4 lg:col-span-1">
              <div className="rounded-[1.25rem] border p-4" style={{ background: C_CLOUD, borderColor: C_NIGHT }}>
                <div className="text-sm mb-1 font-bold" style={{ color: `${C_OFFEE}B3` }}>Total Reimbursements Request</div>
                <div className="text-4xl font-extrabold" style={{ color: C_OFFEE }}>{ALL.length}</div>
              </div>

              <div className="rounded-[1.25rem] border p-6" style={{ background: C_SLATE, borderColor: C_NIGHT}}>
                <div className="text-sm mb-1 font-bold" style={{ color: `${C_OFFEE}B3` }}>Amount received</div>
                <div className="text-4xl font-extrabold" style={{ color: C_GREEN }}>{fmt(approvedSum)}</div>
              </div>

              <div className="rounded-[1.25rem] border p-6" style={{ background: "#FFDBBB", borderColor: C_NIGHT }}>
                <div className="text-sm mb-1 font-bold" style={{ color: `${C_OFFEE}B3` }}>Pending claims</div>
                <div className="text-4xl font-extrabold" style={{ color: C_ORANGE }}>
                  {fmt(P.reduce((s, it) => s + getAmt(it), 0))}
                </div>
              </div>
            </div>

            <div className="rounded-[1.25rem] border p-4 lg:col-span-2" style={{ background: C_CLOUD, borderColor: C_NIGHT }}>
              <div className="text-sm mb-2 font-bold" style={{ color: `${C_OFFEE}B3` }}>Status by category</div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${C_NIGHT}80`} />
                    <XAxis
                      dataKey="category"
                      tick={WrappedTick}
                      interval={0}
                      height={56}
                      tickMargin={10}
                      tickLine={false}
                      axisLine={{ stroke: C_NIGHT }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: C_OFFEE }}
                      axisLine={{ stroke: C_NIGHT }}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={{ fontSize: "12px", borderColor: C_NIGHT }} />
                    <Legend wrapperStyle={{ fontSize: "12px", color: C_OFFEE }} />
                    <Bar dataKey="Pending"  stackId="a" fill={C_ORANGE} isAnimationActive={false} />
                    <Bar dataKey="Approved" stackId="a" fill={C_GREEN}  isAnimationActive={false} />
                    <Bar dataKey="Rejected" stackId="a" fill={C_RED}    isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ===== ROW 3: Table ===== */}
          <div className="mt-6 rounded-[1.25rem] border overflow-x-auto" style={{background: C_CLOUD, borderColor: C_NIGHT }}>
            <div
              className="px-4 py-3 border-b text-sm font-bold"
              style={{ background: C_EGGSHELL, borderColor: C_NIGHT, color: C_OFFEE }}
            >
              Category summary
            </div>
            <table className="min-w-full text-sm" style={{ color: C_OFFEE }}>
              <thead>
                <tr style={{ background: C_EGGSHELL, color: C_OFFEE }}>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Pending</th>
                  <th className="px-4 py-2 text-left">Approved</th>
                  <th className="px-4 py-2 text-left">Rejected</th>
                  <th className="px-4 py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.category} className="border-t" style={{ borderColor: C_NIGHT }}>
                    <td className="px-4 py-2 font-medium">{r.category}</td>
                    <td className="px-4 py-2">{r.counts.Pending}/{fmt(r.sums.Pending)}</td>
                    <td className="px-4 py-2">{r.counts.Approved}/{fmt(r.sums.Approved)}</td>
                    <td className="px-4 py-2">{r.counts.Rejected}/{fmt(r.sums.Rejected)}</td>
                    <td className="px-4 py-2">{r.counts.Total}/{fmt(r.sums.Total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold" style={{ background: C_CLOUD, borderColor: C_NIGHT }}>
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2">{totals.counts.Pending}/{fmt(totals.sums.Pending)}</td>
                  <td className="px-4 py-2">{totals.counts.Approved}/{fmt(totals.sums.Approved)}</td>
                  <td className="px-4 py-2">{totals.counts.Rejected}/{fmt(totals.sums.Rejected)}</td>
                  <td className="px-4 py-2">{totals.counts.Total}/{fmt(totals.sums.Total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
