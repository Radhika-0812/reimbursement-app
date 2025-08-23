// src/pages/HomePage.jsx
import React, { useEffect, useMemo } from "react";
import { useClaims } from "../state/ClaimsContext";
import {
  ResponsiveContainer,
  Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { centsFromClaim, formatCents } from "../lib/money"; // 👈 work in cents (paise)

// Small inline tick renderer: split on "_" and stack lines
const WrappedTick = ({ x, y, payload }) => {
  const parts = String(payload?.value ?? "").split("_");
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fontSize={12} fill="#374151">
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

  // ---- Table (counts + sums in **cents**) ----
  const getAmt = (it) => centsFromClaim(it);          // 👈 always cents
  const fmt    = (n)  => formatCents(n);              // 👈 group digits, no currency symbol

  const tableRows = useMemo(() => {
    const m = new Map();
    const add = (list, key) => {
      for (const it of list) {
        const c = catOf(it);
        const amt = getAmt(it);                        // cents
        const row = m.get(c) || {
          category: c,
          counts: { Pending: 0, Approved: 0, Rejected: 0 },
          sums:   { Pending: 0, Approved: 0, Rejected: 0 },
        };
        row.counts[key] += 1;
        row.sums[key]   += amt;                        // accumulate cents
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
        acc.sums[k]   += r.sums[k];                    // cents
      }
      return acc;
    }, { counts: { Pending: 0, Approved: 0, Rejected: 0, Total: 0 },
         sums:   { Pending: 0, Approved: 0, Rejected: 0, Total: 0 } });
  }, [tableRows]);

  // KPI for approved sum (in cents)
  const approvedSum = useMemo(() => A.reduce((s, it) => s + getAmt(it), 0), [A]);

  const hasData = ALL.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4">Dashboard</h1>

      {/* Top KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-3xl font-bold">{kpi.pending}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Approved</div>
          <div className="text-3xl font-bold">{kpi.approved}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Rejected</div>
          <div className="text-3xl font-bold">{kpi.rejected}</div>
        </div>
      </div>

      {!hasData && (
        <div className="rounded-xl border bg-white p-6">
          <div className="text-gray-700 font-medium">No claims yet.</div>
          <div className="text-sm text-gray-500">Create claims to see charts here.</div>
        </div>
      )}

      {hasData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: KPIs */}
            <div className="space-y-4">
              {/* Total reimbursements (all claims count) */}
              <div className="rounded-xl border bg-white p-4">
                <div className="text-sm text-gray-600 mb-1">Total Reimbursements Request</div>
                <div className="text-4xl font-extrabold">{ALL.length}</div>
              </div>

              {/* Amount received (Approved sum) — in cents */}
              <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                <div className="text-sm text-green-700 mb-1">Amount received </div>
                <div className="text-4xl font-extrabold text-green-700">
                  {fmt(approvedSum)}
                </div>
              </div>

              {/* Pending claims sum — in cents */}
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
                <div className="text-sm text-orange-400 mb-1">Pending claims </div>
                <div className="text-4xl font-extrabold text-orange-400">
                  {fmt(P.reduce((s, it) => s + getAmt(it), 0))}
                </div>
              </div>
            </div>

            {/* RIGHT: Bar chart (status counts by category) */}
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm text-gray-600 mb-2">Status by category</div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%" debounce={0}>
                  <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="category"
                      tick={WrappedTick}
                      interval={0}
                      height={56}
                      tickMargin={10}
                      tickLine={false}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ fontSize: "9px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="Pending"  stackId="a" fill="#f59e0b" isAnimationActive={false} />
                    <Bar dataKey="Approved" stackId="a" fill="#16a34a" isAnimationActive={false} />
                    <Bar dataKey="Rejected" stackId="a" fill="#ef4444" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table: show "count/sum" (cents) */}
          <div className="mt-6 rounded-xl border bg-white overflow-x-auto">
            <div className="px-4 py-3 border-b bg-gray-50 text-sm text-gray-700">Category summary </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Pending</th>
                  <th className="px-4 py-2">Approved</th>
                  <th className="px-4 py-2">Rejected</th>
                  <th className="px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.category} className="border-t">
                    <td className="px-4 py-2 font-medium">{r.category}</td>
                    <td className="px-4 py-2">{r.counts.Pending}/{fmt(r.sums.Pending)}</td>
                    <td className="px-4 py-2">{r.counts.Approved}/{fmt(r.sums.Approved)}</td>
                    <td className="px-4 py-2">{r.counts.Rejected}/{fmt(r.sums.Rejected)}</td>
                    <td className="px-4 py-2">{r.counts.Total}/{fmt(r.sums.Total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50 font-semibold">
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
