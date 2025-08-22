// src/pages/HomePage.jsx
import React, { useEffect, useMemo, useRef, useLayoutEffect, useState } from "react";
import { useClaims } from "../state/ClaimsContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";

function inr(n) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
  } catch {
    return `₹${(n || 0).toFixed(2)}`;
  }
}

// numeric amount in rupees (supports multiple shapes)
function getAmountRupees(it) {
  if (!it) return 0;
  if (typeof it.amount === "number") return it.amount;
  if (typeof it.amount === "string") return Number(it.amount) || 0;
  if (typeof it.amountCents === "number") return it.amountCents;
  if (typeof it.amount_cents === "number") return it.amount_cents;
  if (typeof it.amount_paise === "number") return it.amount_paise;
  if (typeof it.claimAmount === "number") return it.claimAmount;
  if (typeof it.value === "number") return it.value;
  return 0;
}

/** Chart frame that provides a stable integer width/height to Recharts */
function ChartFrame({ height = 256, children }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    let raf = 0;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect || el.getBoundingClientRect();
      // Round to an int to avoid +/-0.5px ping-pong
      const iw = Math.max(0, Math.round(width));
      if (iw !== w) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => setW(iw));
      }
    });

    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [w]);

  return (
    <div
      ref={ref}
      className="w-full"
      style={{
        height,
        minWidth: 0,
        overflow: "hidden",
        // isolate sizing so siblings/layout changes don't bounce us
        contain: "layout size",
      }}
    >
      {w > 0 ? children(w, height) : null}
    </div>
  );
}

export default function HomePage() {
  const { pending, approved = [], rejected = [], refresh } = useClaims();

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  // Normalize arrays -> single list with explicit status & safe fields
  const rows = useMemo(() => {
    const tag = (arr, __status) =>
      (Array.isArray(arr) ? arr : []).map((c) => ({
        ...c,
        __status,
        __category: (c.category || c.claimType || c.type || "Other").toString(),
        __amount: getAmountRupees(c),
      }));
    return [...tag(pending, "Pending"), ...tag(approved, "Approved"), ...tag(rejected, "Rejected")];
  }, [pending, approved, rejected]);

  // KPI cards (exact counts from source arrays)
  const kpis = useMemo(
    () => ({
      Pending: Array.isArray(pending) ? pending.length : 0,
      Approved: Array.isArray(approved) ? approved.length : 0,
      Rejected: Array.isArray(rejected) ? rejected.length : 0,
    }),
    [pending, approved, rejected]
  );

  // Category × Status matrix (table & charts source of truth)
  const categoryMatrix = useMemo(() => {
    const idx = new Map();
    for (const r of rows) {
      const key = r.__category;
      const row =
        idx.get(key) || {
          category: key,
          Pending: { count: 0, sum: 0 },
          Approved: { count: 0, sum: 0 },
          Rejected: { count: 0, sum: 0 },
          Totals: { count: 0, sum: 0 },
        };
      row[r.__status].count += 1;
      row[r.__status].sum += r.__amount;
      row.Totals.count += 1;
      row.Totals.sum += r.__amount;
      idx.set(key, row);
    }
    return Array.from(idx.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [rows]);

  // Chart data derived from matrix
  const pieData = useMemo(
    () =>
      categoryMatrix
        .map((r) => ({ name: r.category, value: Number(r.Totals.count || 0) }))
        .filter((d) => d.value > 0),
    [categoryMatrix]
  );
  const barData = useMemo(
    () =>
      categoryMatrix
        .map((r) => ({
          category: r.category,
          Pending: Number(r.Pending.count || 0),
          Approved: Number(r.Approved.count || 0),
          Rejected: Number(r.Rejected.count || 0),
        }))
        .filter((d) => d.Pending + d.Approved + d.Rejected > 0),
    [categoryMatrix]
  );

  // Grand totals (table footer)
  const grand = useMemo(() => {
    const g = {
      Pending: { count: 0, sum: 0 },
      Approved: { count: 0, sum: 0 },
      Rejected: { count: 0, sum: 0 },
      Totals: { count: 0, sum: 0 },
    };
    for (const r of categoryMatrix) {
      for (const k of ["Pending", "Approved", "Rejected", "Totals"]) {
        g[k].count += r[k].count;
        g[k].sum += r[k].sum;
      }
    }
    return g;
  }, [categoryMatrix]);

  const COLORS = ["#4f46e5", "#16a34a", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7", "#22c55e", "#f97316"];

  const hasAnyData = rows.length > 0;
  const hasPieData = pieData.length > 0;
  const hasBarData = barData.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-3xl font-bold">{kpis.Pending}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Accepted</div>
          <div className="text-3xl font-bold">{kpis.Approved}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Rejected</div>
          <div className="text-3xl font-bold">{kpis.Rejected}</div>
        </div>
      </div>

      {!hasAnyData && (
        <div className="rounded-xl border bg-white p-6">
          <div className="text-gray-700 font-medium">No claims yet.</div>
          <div className="text-sm text-gray-500">Create claims to see charts here.</div>
        </div>
      )}

      {hasAnyData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie: claims by category */}
            <div className="rounded-xl border bg-white p-4 overflow-hidden">
              <div className="text-sm text-gray-600 mb-2">Claims by category</div>
              <ChartFrame height={256}>
                {(w, h) => (
                  <PieChart width={w} height={h}>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx={w / 2}
                      cy={h / 3}
                      outerRadius={Math.min(w, h) * 0.35}
                      label={false}
                      isAnimationActive={false}
                    >
                      {pieData.map((d, i) => (
                        <Cell key={d.name ?? i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "9px" }} />
                    <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: "9px" }} />
                  </PieChart>
                )}
              </ChartFrame>
            </div>

            {/* Stacked bar: Status by category */}
            <div className="rounded-xl border bg-white p-4 overflow-hidden">
              <div className="text-sm text-gray-600 mb-2">Status by category</div>
              <ChartFrame height={256}>
                {(w, h) => (
                  <BarChart
                    width={w}
                    height={h}
                    data={barData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    barCategoryGap={12}
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="category"
                      type="category"
                      tick={{ fontSize: 9 }}
                      interval="preserveStartEnd"
                      minTickGap={8}
                      tickLine={true}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ fontSize: "9px" }} />
                    <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="Pending"  stackId="a" fill="#f59e0b" isAnimationActive={false} />
                    <Bar dataKey="Approved" stackId="a" fill="#16a34a" isAnimationActive={false} />
                    <Bar dataKey="Rejected" stackId="a" fill="#ef4444" isAnimationActive={false} />
                  </BarChart>
                )}
              </ChartFrame>
            </div>
          </div>

          {/* Category × Status table */}
          <div className="mt-6 rounded-xl border bg-white overflow-x-auto">
            <div className="px-4 py-3 border-b bg-gray-50 text-sm text-gray-700">
              Category summary (counts & sums)
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Pending</th>
                  <th className="px-4 py-2">Accepted</th>
                  <th className="px-4 py-2">Rejected</th>
                  <th className="px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {categoryMatrix.map((r) => (
                  <tr key={r.category} className="border-t">
                    <td className="px-4 py-2 font-medium">{r.category}</td>
                    <td className="px-4 py-2">{r.Pending.count} &nbsp; / &nbsp; {inr(r.Pending.sum)}</td>
                    <td className="px-4 py-2">{r.Approved.count} &nbsp; / &nbsp; {inr(r.Approved.sum)}</td>
                    <td className="px-4 py-2">{r.Rejected.count} &nbsp; / &nbsp; {inr(r.Rejected.sum)}</td>
                    <td className="px-4 py-2">{r.Totals.count} &nbsp; / &nbsp; {inr(r.Totals.sum)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50 font-semibold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2">{grand.Pending.count} &nbsp; / &nbsp; {inr(grand.Pending.sum)}</td>
                  <td className="px-4 py-2">{grand.Approved.count} &nbsp; / &nbsp; {inr(grand.Approved.sum)}</td>
                  <td className="px-4 py-2">{grand.Rejected.count} &nbsp; / &nbsp; {inr(grand.Rejected.sum)}</td>
                  <td className="px-4 py-2">{grand.Totals.count} &nbsp; / &nbsp; {inr(grand.Totals.sum)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
