import React, { useEffect, useRef, useState } from "react";

// ---- Config ----
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const ENDPOINTS = {
  // Lists (paged)
  pending:  "/api/admin/claims/pending",
  approved: "/api/admin/claims/approved",
  rejected: "/api/admin/claims/rejected",
  // Actions
  approveTpl: "/api/admin/claims/:id/approve",
  rejectTpl:  "/api/admin/claims/:id/reject",
};
const AUTH_TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || "auth_token";

// ---- HTTP helper ----
async function http(method, path, { body, token, headers: extraHeaders } = {}) {
  const url = path.startsWith("http") ? path : API_BASE_URL + path;
  const headers = { ...(extraHeaders || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && headers["Content-Type"] === undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : headers["Content-Type"] === "application/json"
        ? JSON.stringify(body)
        : body,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} ${res.statusText} for ${method} ${url} => ${text}`);
    err.status = res.status;
    err.responseText = text;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

function getAuth() {
  const keys = [AUTH_TOKEN_KEY, "access_token", "token", "jwt"];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  const m = document.cookie.match(/(?:^|; )(?:auth_token|access_token)=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ---- UI bits ----
function Pagination({ page, pageCount, onPage }) {
  return (
    <div className="flex items-center gap-2 mt-4">
      <button className="px-3 py-1 rounded border disabled:opacity-50" onClick={() => onPage(page - 1)} disabled={page <= 1}>Prev</button>
      <span className="text-sm">Page {page} / {pageCount}</span>
      <button className="px-3 py-1 rounded border disabled:opacity-50" onClick={() => onPage(page + 1)} disabled={page >= pageCount}>Next</button>
    </div>
  );
}

function RejectModal({ open, onClose, onSubmit }) {
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const firstFieldRef = useRef(null);
  useEffect(() => {
    if (open) {
      setComment(""); setErr("");
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    }
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-4 shadow-xl">
        <div className="text-lg font-semibold">Reject Claim</div>
        <label className="block mt-4 text-sm font-medium">Reason / Comment *</label>
        <textarea
          ref={firstFieldRef}
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-2 border rounded"
        />
        {err && <div className="text-red-600 text-sm mt-1">{err}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-2 rounded border" onClick={onClose}>Cancel</button>
          <button
            className="px-3 py-2 rounded bg-red-600 text-white"
            onClick={() => { if (!comment.trim()) { setErr("Comment is required"); return; } onSubmit(comment.trim()); }}
          >Reject</button>
        </div>
      </div>
    </div>
  );
}

function displayUserName(c) {
  return (
    c.userName ??
    c.user?.name ??
    c.user?.username ??
    c.user?.fullName ??
    c.user?.email ??
    "—"
  );
}

export default function AdminDashboard() {
  const token = getAuth();
  const [pending, setPending] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyRow, setBusyRow] = useState(null);
  const [rejectRow, setRejectRow] = useState(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);

  const buildUrl = (tpl, id) => tpl.replace(":id", String(id));

  async function fetchCounts() {
    const [approvedPage, rejectedPage, pendingPage] = await Promise.all([
      http("GET", `${ENDPOINTS.approved}?page=0&size=1`, { token }),
      http("GET", `${ENDPOINTS.rejected}?page=0&size=1`, { token }),
      http("GET", `${ENDPOINTS.pending}?page=0&size=1`, { token }),
    ]);
    const totalOf = (x) => x?.totalElements ?? x?.page?.totalElements ?? (Array.isArray(x) ? x.length : 0);
    setCounts({
      approved: totalOf(approvedPage),
      rejected: totalOf(rejectedPage),
      pending:  totalOf(pendingPage),
    });
  }

  async function fetchPending(currentPage = 1) {
    const data = await http("GET", `${ENDPOINTS.pending}?page=${currentPage - 1}&size=10`, { token });
    const rows = Array.isArray(data) ? data : (data?.content ?? []);
    setPending(rows);
    setPageCount(data?.totalPages ?? 1);
    setTotal(data?.totalElements ?? rows.length);
  }

  useEffect(() => {
    (async () => {
      try {
        if (!token) {
          setError("Not authenticated. Please sign in as an admin.");
          return;
        }
        await fetchCounts();
        await fetchPending(1);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

  // Approve: we don't know your exact mapping; try common methods with NO BODY
  async function doApprove(claim) {
    setBusyRow(claim.id);
    try {
      const methods = ["POST", "PUT", "PATCH"];
      let lastErr;
      for (const m of methods) {
        try { await http(m, buildUrl(ENDPOINTS.approveTpl, claim.id), { token }); lastErr = null; break; }
        catch (e) { lastErr = e; if (e.status !== 405) throw e; }
      }
      if (lastErr) throw lastErr;
      await Promise.all([fetchCounts(), fetchPending(page)]);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusyRow(null);
    }
  }

  // Reject: EXACTLY your controller — PATCH with JSON { adminComment }
  async function doReject(claim, comment) {
    setBusyRow(claim.id);
    try {
      await http("PATCH", buildUrl(ENDPOINTS.rejectTpl, claim.id), {
        token,
        body: { adminComment: comment },
      });
      await Promise.all([fetchCounts(), fetchPending(page)]);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusyRow(null);
      setRejectRow(null);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Claims</h1>
        <button onClick={() => { fetchCounts(); fetchPending(page); }} className="px-3 py-2 rounded border">Refresh</button>
      </div>

      {error && <div className="mt-3 p-3 rounded bg-red-50 text-red-700 border text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <Kpi label="Pending"  value={counts.pending} />
        <Kpi label="Approved" value={counts.approved} />
        <Kpi label="Rejected" value={counts.rejected} />
      </div>

      <div className="mt-6 bg-white rounded-2xl border shadow overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 text-sm text-gray-600">
          Pending Claims (page {page} of {pageCount}) — total {total}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2">User Name</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
              ) : pending.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No pending claims</td></tr>
              ) : pending.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{displayUserName(c)}</td>
                  <td className="px-4 py-2">{c.title}</td>
                  <td className="px-4 py-2">{c.claimType}</td>
                  <td className="px-4 py-2">₹{(c.amountCents ?? 0) / 100}</td>
                  <td className="px-4 py-2">{new Date(c.createdAt ?? c.created_at ?? Date.now()).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        disabled={busyRow === c.id}
                        onClick={() => doApprove(c)}
                        className="px-3 py-1 rounded bg-emerald-600 text-white disabled:opacity-50"
                      >Approve</button>
                      <button
                        disabled={busyRow === c.id}
                        onClick={() => setRejectRow(c)}
                        className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
                      >Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t bg-gray-50">
          <Pagination
            page={page}
            pageCount={pageCount}
            onPage={(p) => { setPage(p); fetchPending(p); }}
          />
        </div>
      </div>

      <RejectModal
        open={!!rejectRow}
        onClose={() => setRejectRow(null)}
        onSubmit={(comment) => doReject(rejectRow, comment)}
      />
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-2xl shadow p-4 border bg-white">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
