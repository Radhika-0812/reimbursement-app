// src/pages/ClosedClaims.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useClaims } from "../state/ClaimsContext";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 5; // match PendingClaims

export default function ClosedClaims() {
  const { closed = [], loading, refresh } = useClaims();
  const [page, setPage] = useState(1);

  // fetch on page open (same as PendingClaims)
  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const total = closed?.length || 0;

  // slice for current page (same logic as PendingClaims)
  const pageItems = useMemo(() => {
    if (!Array.isArray(closed)) return [];
    const start = (page - 1) * PAGE_SIZE;
    return closed.slice(start, start + PAGE_SIZE);
  }, [closed, page]);

  // reset to page 1 if the list size shrinks (same as PendingClaims)
  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > pageCount) setPage(1);
  }, [total, page]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4">
        Closed Claims
      </h1>

      {loading && <p>Loading…</p>}

      {!loading && total === 0 && (
        <p className="text-gray-500">No closed claims.</p>
      )}

      {!loading && total > 0 && (
        <>
          <div className="space-y-3">
            {pageItems.map((c) => (
              <div
                key={c.id ?? c.claimId}
                className="flex items-center justify-between border p-4 rounded-lg bg-white"
              >
                <div>
                  <div className="font-medium capitalize">
                    {c.title ?? c.category}
                  </div>
                  <div className="text-sm text-gray-600">
                    Status: {c.status ?? "—"}
                  </div>
                  {c.closedAt && (
                    <div className="text-sm text-gray-500">
                      Closed: {new Date(c.closedAt).toLocaleString()}
                    </div>
                  )}
                  <div className="text-sm text-gray-500">
                    Amount: ₹
                    {c.amountCents != null ? c.amountCents : c.amount}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* pagination controls */}
          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        </>
      )}
    </div>
  );
}
