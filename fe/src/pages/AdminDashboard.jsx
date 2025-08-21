import React, { useEffect, useMemo, useState } from "react";
import {
  adminCounts,
  listPendingForAll,
  approveClaim,
  rejectClaim,
} from "../services/claims";

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Reject modal
  const [dialog, setDialog] = useState({ open: false, id: null, comment: "" });

  const fmtAmount = (it) => {
    if (it?.amountCents != null) return (it.amountCents / 100).toFixed(2);
    const n = Number(it?.amount ?? 0);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  };

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const c = await adminCounts();
      const cc = c?.data ?? c ?? {};
      setCounts({
        pending: Number(cc.pending ?? 0),
        approved: Number(cc.approved ?? 0),
        rejected: Number(cc.rejected ?? 0),
      });

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

  // In case your API has multiple pending statuses
  const grouped = useMemo(() => {
    const g = { pending_manager: [], pending_finance: [], pending: [], other: [] };
    for (const it of list) {
      const s = String(it.status ?? "pending").toLowerCase();
      if (g[s]) g[s].push(it);
      else g.other.push(it);
    }
    return g;
  }, [list]);

  async function onApprove(id) {
    await approveClaim(id);
    await refresh();
  }

  function openReject(id) {
    setDialog({ open: true, id, comment: "" });
  }
  async function submitReject() {
    if (!dialog.comment.trim()) return; // mandatory
    await rejectClaim(dialog.id, dialog.comment.trim());
    setDialog({ open: false, id: null, comment: "" });
    await refresh();
  }

  const Section = ({ title, items }) => (
    <>
      <h3 className="text-lg font-semibold mt-4 mb-2">
        {title} <span className="text-gray-500">({items.length})</span>
      </h3>

      {items.length === 0 ? (
        <div className="text-gray-500 mb-2">None</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead>
              <tr className="text-left text-sm text-gray-600">
                <th className="px-3 py-2 border-b">Title / Category</th>
                <th className="px-3 py-2 border-b">Amount</th>
                <th className="px-3 py-2 border-b">Created</th>
                <th className="px-3 py-2 border-b">Submitted By</th>
                <th className="px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const amount = fmtAmount(it);
                const category = it.claimType || it.category || "—";
                const created = it.createdAt ? new Date(it.createdAt).toLocaleString() : "—";
                const who = it.userName || it.user?.name || "—";
                const title = it.title || category || "Untitled";

                return (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{title}</div>
                      {it.description && (
                        <div className="text-xs text-gray-500">{it.description}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">₹{amount}</td>
                    <td className="px-3 py-2">{created}</td>
                    <td className="px-3 py-2">{who}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 rounded bg-green-700 text-white hover:bg-green-800"
                          onClick={() => onApprove(it.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-red-700 text-white hover:bg-red-800"
                          onClick={() => openReject(it.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
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

      {/* Pending lists by status (shows counts right in headers) */}
      <Section title="Pending (Manager)" items={grouped.pending_manager} />
      <Section title="Pending (Finance)" items={grouped.pending_finance} />
      <Section title="Pending (Other)" items={grouped.pending} />

      {/* Reject modal — mandatory comment */}
      {dialog.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-2">Reject claim</h2>
            <label className="block text-sm">
              <span className="text-gray-700">Comment (required)</span>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={dialog.comment}
                onChange={(e) => setDialog((d) => ({ ...d, comment: e.target.value }))}
                placeholder="Explain the reason for rejection…"
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setDialog({ open: false, id: null, comment: "" })}
                className="px-3 py-1.5 rounded-md border"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={!dialog.comment.trim()}
                className="px-3 py-1.5 rounded-md bg-red-700 text-white hover:bg-red-800 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
