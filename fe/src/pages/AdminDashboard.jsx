import React, { useEffect, useState } from "react";
import {
  adminCounts,
  listPendingForAll,
  approveClaim,
  rejectClaim,
} from "../services/claims";
import NavBar from "../components/NavBar";

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      // counts: support {pending, approved, rejected} or {data:{...}}
      const c = await adminCounts();
      const cc = c?.data ?? c ?? {};
      setCounts({
        pending: Number(cc.pending ?? 0),
        approved: Number(cc.approved ?? 0),
        rejected: Number(cc.rejected ?? 0),
      });

      // pending list
      const p = await listPendingForAll();
      const items = Array.isArray(p) ? p : (p?.data ?? p?.content ?? []);
      setList(items || []);
    } catch (e) {
      setErr(e.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const fmtAmount = (it) => {
    if (it?.amountCents != null) return (it.amountCents / 100).toFixed(2);
    if (typeof it?.amount === "number") return it.amount.toFixed(2);
    const n = Number(it?.amount ?? 0);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
    };

  async function onApprove(id) {
    await approveClaim(id);
    await refresh();
  }

  async function onReject(id) {
    const reason = window.prompt("Reason for rejection (optional)") || "";
    await rejectClaim(id, reason);
    await refresh();
  }

  return (

    <div>
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin</h1>

      {err && <div className="text-red-600 mb-3">{err}</div>}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-3xl font-bold">{counts.pending}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Approved</div>
          <div className="text-3xl font-bold">{counts.approved}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Rejected</div>
          <div className="text-3xl font-bold">{counts.rejected}</div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-2">Pending approvals</h2>

      {loading && <div className="text-gray-500">Loading…</div>}

      {!loading && list.length === 0 && (
        <div className="text-gray-500">No pending claims.</div>
      )}

      {!loading && list.length > 0 && (
        <div className="space-y-2">
          {list.map((item) => {
            const amount = fmtAmount(item);
            const category = item.claimType || item.category || "—";
            const created =
              item.createdAt ? new Date(item.createdAt).toLocaleString() : "—";
            const submittedBy = item.userName || item.user?.name || "—";

            return (
              <div
                key={item.id}
                className="border rounded p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white"
              >
                <div className="mb-3 sm:mb-0">
                  <div className="font-medium">
                    {item.title || "Untitled"} – ₹{amount}
                  </div>
                  <div className="text-sm text-gray-600">
                    {category}
                    {item.description ? ` · ${item.description}` : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {created} · By: {submittedBy}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded bg-green-700 text-white hover:bg-green-800"
                    onClick={() => onApprove(item.id)}
                  >
                    Approve
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-red-700 text-white hover:bg-red-800"
                    onClick={() => onReject(item.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
