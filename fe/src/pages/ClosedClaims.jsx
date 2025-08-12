import React from "react";
import { useAuth } from "../state/AuthContext";
import { useClaims } from "../state/ClaimsContext";
import NavBar from "../components/NavBar";

/**
 * Closed view:
 * - employee: their own closed items
 * - manager: closed items for their team (claims where managerId === manager.id)
 * - finance/admin: all closed items
 */
export default function ClosedClaims() {
  const { user } = useAuth();
  const { claims } = useClaims();

  let list = [];
  if (user.role === "employee") {
    list = claims.filter((c) => c.status === "closed" && c.userId === user.id);
  } else if (user.role === "manager") {
    list = claims.filter((c) => c.status === "closed" && c.managerId === user.id);
  } else {
    // finance or admin (or any other elevated roles)
    list = claims.filter((c) => c.status === "closed");
  }

  return (
    <div>
        <NavBar />
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4">Closed Claims</h1>

      {list.length === 0 ? (
        <div className="text-gray-500">No closed claims.</div>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <div key={c.id} className="border p-4 rounded-lg bg-white">
              <div className="flex items-center justify-between">
                <div className="font-medium capitalize">{c.category}</div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-600 text-white">Closed</span>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                <div>Amount: ₹{c.amount}</div>
                <div>Created: {new Date(c.createdAt).toLocaleString()}</div>
              </div>

              {/* optional: show last finance comment from history */}
              {Array.isArray(c.history) && c.history.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <div className="font-medium">Approval Trail</div>
                  <ul className="mt-1 list-disc ml-5">
                    {c.history.map((h, idx) => (
                      <li key={idx}>
                        <span className="capitalize">{h.role}</span> {h.action} on{" "}
                        {new Date(h.at).toLocaleString()}
                        {h.comment ? <> — <span className="italic">“{h.comment}”</span></> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
