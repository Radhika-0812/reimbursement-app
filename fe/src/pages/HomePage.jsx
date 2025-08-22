// src/pages/HomePage.jsx
import React, { useEffect, useMemo } from "react";
import { useClaims } from "../state/ClaimsContext";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

// Small inline tick renderer: split on "_" and stack lines
function WrappedTick({ x, y, payload }) {
  const parts = String(payload?.value ?? "").split("_"); // ['cab','allowance']
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fontSize={12} fill="#374151">
        {parts.map((s, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 0 : 12}>{s}</tspan>
        ))}
      </text>
    </g>
  );
}

export default function HomePage() {
  const { pending = [], approved = [], rejected = [], refresh } = useClaims();

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const P = Array.isArray(pending) ? pending : [];
  const A = Array.isArray(approved) ? approved : [];
  const R = Array.isArray(rejected) ? rejected : [];
  const ALL = useMemo(() => [...P, ...A, ...R], [P, A, R]);

  const kpi = { pending: P.length, approved: A.length, rejected: R.length };
  const catOf = (it) => String(it?.category ?? it?.claimType ?? "Other");

  const pieData = useMemo(() => {
    const m = new Map();
    for (const it of ALL) {
      const c = catOf(it);
      m.set(c, (m.get(c) || 0) + 1);
    }
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [ALL]);

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

  const tableRows = useMemo(
    () => barData.map((r) => ({ ...r, Total: r.Pending + r.Approved + r.Rejected })),
    [barData]
  );

  const COLORS = ["#4f46e5","#16a34a","#f59e0b","#ef4444","#0ea5e9","#a855f7","#22c55e","#f97316"];
  const hasData = ALL.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4">Dashboard</h1>

      {/* KPI cards */}
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
            {/* Pie chart */}
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm text-gray-600 mb-2">Claims by category</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" debounce={150}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} isAnimationActive={false}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar chart */}
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm text-gray-600 mb-2">Status by category</div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%" debounce={0}>
                  <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="category"
                      tick={WrappedTick}     // 👈 use our 2-line tick
                      interval={0}
                      height={56}            // room for two lines
                      tickMargin={10}        // gap from axis line
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

          {/* Table */}
          <div className="mt-6 rounded-xl border bg-white overflow-x-auto">
            <div className="px-4 py-3 border-b bg-gray-50 text-sm text-gray-700">Category summary</div>
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
                    <td className="px-4 py-2">{r.Pending}</td>
                    <td className="px-4 py-2">{r.Approved}</td>
                    <td className="px-4 py-2">{r.Rejected}</td>
                    <td className="px-4 py-2">{r.Total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50 font-semibold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2">{tableRows.reduce((s, r) => s + r.Pending, 0)}</td>
                  <td className="px-4 py-2">{tableRows.reduce((s, r) => s + r.Approved, 0)}</td>
                  <td className="px-4 py-2">{tableRows.reduce((s, r) => s + r.Rejected, 0)}</td>
                  <td className="px-4 py-2">{tableRows.reduce((s, r) => s + r.Total, 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
