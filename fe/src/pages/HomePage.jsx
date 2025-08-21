// src/pages/HomePage.jsx
import React, { useEffect, useMemo } from "react";
import { useClaims } from "../state/ClaimsContext";
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase();
  if (v.includes("reject")) return "Rejected";
  if (v.includes("approve") || v.includes("accepted") || v.includes("closed") || v.includes("close")) return "Approved";
  return "Pending";
}

function inr(n) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
  } catch {
    return `₹${(n || 0).toFixed(2)}`;
  }
}

// best-effort extraction of amount as rupees (supports amount or amountCents)
function getAmountRupees(it) {
  if (it == null) return 0;
  // Common fields first
  if (typeof it.amount === "number") return it.amount;
  if (typeof it.amount === "string") return Number(it.amount) || 0;
  // Cents/paise fallbacks seen elsewhere in your code
  if (typeof it.amountCents === "number") return it.amountCents ;
  if (typeof it.amount_cents === "number") return it.amount_cents ;
  if (typeof it.amount_paise === "number") return it.amount_paise ;
  // Other possible names
  if (typeof it.claimAmount === "number") return it.claimAmount;
  if (typeof it.value === "number") return it.value;
  return 0;
}

export default function HomePage() {
  const { pending, closed = [], refresh } = useClaims();
  useEffect(() => { refresh().catch(() => {}); }, []); // fetch on page open

  const all = useMemo(() => {
    const p = Array.isArray(pending) ? pending : [];
    const c = Array.isArray(closed) ? closed : [];
    return [...p, ...c];
  }, [pending, closed]);

  // Overall status totals (counts)
  const statusTotals = useMemo(() => {
    const t = { Pending: 0, Approved: 0, Rejected: 0 };
    for (const it of all) t[normalizeStatus(it.status)]++;
    return t;
  }, [all]);

  // Pie input: count per category
  const categoryTotals = useMemo(() => {
    const m = new Map();
    for (const it of all) {
      const cat = (it.category || it.claimType || "Other").toString();
      m.set(cat, (m.get(cat) || 0) + 1);
    }
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [all]);

  // Stacked bar: count of statuses per category
  const byCategoryStatus = useMemo(() => {
    const idx = new Map();
    for (const it of all) {
      const cat = (it.category || it.claimType || "Other").toString();
      const st = normalizeStatus(it.status);
      const row = idx.get(cat) || { category: cat, Pending: 0, Approved: 0, Rejected: 0 };
      row[st] = (row[st] || 0) + 1;
      idx.set(cat, row);
    }
    return Array.from(idx.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [all]);

  // NEW: Matrix with counts and sums per (category, status)
  const categoryMatrix = useMemo(() => {
    const idx = new Map();
    for (const it of all) {
      const cat = (it.category || it.claimType || "Other").toString();
      const st = normalizeStatus(it.status); // Pending / Approved / Rejected
      const amt = getAmountRupees(it);
      const row =
        idx.get(cat) || {
          category: cat,
          Pending: { count: 0, sum: 0 },
          Approved: { count: 0, sum: 0 },
          Rejected: { count: 0, sum: 0 },
          Totals: { count: 0, sum: 0 },
        };
      row[st].count += 1;
      row[st].sum += amt;
      row.Totals.count += 1;
      row.Totals.sum += amt;
      idx.set(cat, row);
    }
    // stable order by category name
    return Array.from(idx.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [all]);

  // Grand totals across categories (for table footer)
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-3xl font-bold">{statusTotals.Pending}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Accepted</div>
          <div className="text-3xl font-bold">{statusTotals.Approved}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Rejected</div>
          <div className="text-3xl font-bold">{statusTotals.Rejected}</div>
        </div>
      </div>

      {all.length === 0 && (
        <div className="rounded-xl border bg-white p-6">
          <div className="text-gray-700 font-medium">No claims yet.</div>
          <div className="text-sm text-gray-500">Create claims to see charts here.</div>
        </div>
      )}

      {all.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Pie: claims per category */}
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm text-gray-600 mb-2">Pending Claims by category</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryTotals}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={false}
                    >
                      {categoryTotals.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stacked bar: Status by category */}
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm text-gray-600 mb-2">Status by category</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategoryStatus} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="Pending" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="Approved" stackId="a" fill="#16a34a" />
                    <Bar dataKey="Rejected" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* NEW: Category × Status table with counts and sum of amounts */}
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
