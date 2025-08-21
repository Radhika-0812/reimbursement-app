// src/pages/Home.jsx
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
  if (v.includes("approve") || v.includes("closed") || v.includes("close")) return "Approved";
  return "Pending";
}

export default function HomePage() {
  const { pending, closed = [], refresh } = useClaims();
  useEffect(() => { refresh().catch(() => {}); }, []); // fetch on page open

  const all = useMemo(() => {
    const p = Array.isArray(pending) ? pending : [];
    const c = Array.isArray(closed) ? closed : [];
    return [...p, ...c];
  }, [pending, closed]);

  const statusTotals = useMemo(() => {
    const t = { Pending: 0, Approved: 0, Rejected: 0 };
    for (const it of all) t[normalizeStatus(it.status)]++;
    return t;
  }, [all]);

  const categoryTotals = useMemo(() => {
    const m = new Map();
    for (const it of all) {
      const cat = (it.category || it.claimType || "Other").toString();
      m.set(cat, (m.get(cat) || 0) + 1);
    }
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [all]);

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

  const COLORS = ["#4f46e5", "#16a34a", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7", "#22c55e", "#f97316"];
  const BLUE_950 = "#172554";

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
          <div className="text-sm text-gray-600">Approved</div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Pie: claims per category (no labels, no legend) */}
          <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-600 mb-2">Claims by category</div>
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
                  label={false}   // 🚫 removes slice labels
                >
                  {categoryTotals.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} /> {/* ✅ clean legend below */}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stacked bar: Status by category (different colors) */}
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
                <Bar dataKey="Pending" stackId="a" fill="#f59e0b" />   {/* Orange */}
                <Bar dataKey="Approved" stackId="a" fill="#16a34a" /> {/* Green */}
                <Bar dataKey="Rejected" stackId="a" fill="#ef4444" /> {/* Red */}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        </div>
      )}
    </div>
  );
}
  