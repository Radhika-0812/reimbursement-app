import React, { useEffect } from "react";
import { useClaims } from "../state/ClaimsContext";
import NavBar from "../components/NavBar";

export default function PendingClaims() {
  const { pending, loading, refresh } = useClaims();

  useEffect(() => {
    refresh().catch(() => {});
  }, []); // fetch on page open

  return (
    <div>
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4">
        Pending Claims
      </h1>

      {loading && <p>Loading…</p>}

      {!loading && (!pending || pending.length === 0) && (
        <p className="text-gray-500">No pending claims.</p>
      )}

      {!loading && pending?.length > 0 && (
        <div className="space-y-3">
          {pending.map((c) => (
            <div
              key={c.id ?? c.claimId}
              className="flex items-center justify-between border p-4 rounded-lg bg-white"
            >
              <div>
                <div className="font-medium capitalize">
                  {c.title ?? c.category}
                </div>
                <div className="text-sm text-gray-600">Status: Pending</div>
                {c.createdAt && (
                  <div className="text-sm text-gray-500">
                    Created: {new Date(c.createdAt).toLocaleString()}
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  Amount: ₹
                  {c.amountCents != null
                    ? (c.amountCents)
                    : c.amount}
                </div>
              </div>

              {/* Removed the "View receipt" link per request */}
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
