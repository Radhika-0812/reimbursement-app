import React, { useState } from "react";
import { useAuth } from "../state/AuthContext";
import { useClaims } from "../state/ClaimsContext";
import NavBar from "../components/NavBar";

export default function PendingClaims() {
  const { user } = useAuth();
  const { claims, managerDecide, financeDecide } = useClaims();

  let list = [];
  let mode = "none"; // manager | finance | employee | adminAsFinance
  if (user.role === "employee") {
    list = claims.filter(c => c.userId === user.id && (c.status === "pending_manager" || c.status === "pending_finance"));
    mode = "employee";
  } else if (user.role === "manager") {
    list = claims.filter(c => c.status === "pending_manager" && c.managerId === user.id);
    mode = "manager";
  } else if (user.role === "finance") {
    list = claims.filter(c => c.status === "pending_finance");
    mode = "finance";
  } else if (user.role === "admin") {
    list = claims.filter(c => c.status === "pending_manager" || c.status === "pending_finance");
    mode = "adminAsFinance";
  }

  const [dialog, setDialog] = useState({ open:false, claimId:null, approve:true, comment:"" });

  const openDialog = (claimId, approve) => setDialog({ open:true, claimId, approve, comment:"" });
  const submitDecision = () => {
    if (!dialog.comment.trim()) return; // mandatory
    if (mode === "manager") {
      managerDecide({ id: dialog.claimId, actorId: user.id, approve: dialog.approve, comment: dialog.comment.trim() });
    } else {
      financeDecide({ id: dialog.claimId, actorId: user.id, approve: dialog.approve, comment: dialog.comment.trim() });
    }
    setDialog({ open:false, claimId:null, approve:true, comment:"" });
  };

  const Stage = ({ s }) => (
    <span className="font-medium text-yellow-700">
      {s === "pending_manager" ? "Pending (Manager Approval)" :
       s === "pending_finance" ? "Pending (Finance Approval)" : s}
    </span>
  );

  return (
    <div>
       <NavBar />
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
     
      <h1 className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4">Pending Claims</h1>

      {list.length === 0 ? (
        <div className="text-gray-500">No pending claims.</div>
      ) : (
        <div className="space-y-3">
          {list.map(c => (
            <div key={c.id} className="flex items-center justify-between border p-4 rounded-lg bg-white">
              <div>
                <div className="font-medium capitalize">{c.category}</div>
                <div className="text-sm text-gray-600">Status: <Stage s={c.status} /></div>
                <div className="text-sm text-gray-500">Created: {new Date(c.createdAt).toLocaleString()}</div>
                <div className="text-sm text-gray-500">Amount: ₹{c.amount}</div>
              </div>

              {(mode === "manager" || mode === "finance" || mode === "adminAsFinance") && (
                <div className="flex gap-2">
                  <button onClick={() => openDialog(c.id, true)} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">
                    {mode === "manager" ? "Approve → Finance" : "Approve & Close"}
                  </button>
                  <button onClick={() => openDialog(c.id, false)} className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mandatory comment modal */}
      {dialog.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-2">
              {dialog.approve ? (mode === "manager" ? "Approve (send to Finance)" : "Approve & Close") : "Reject"}
            </h2>
            <label className="block text-sm">
              <span className="text-gray-700">Comment (required)</span>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={dialog.comment}
                onChange={(e) => setDialog(d => ({ ...d, comment: e.target.value }))}
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setDialog({ open:false, claimId:null, approve:true, comment:"" })} className="px-3 py-1.5 rounded-md border">
                Cancel
              </button>
              <button onClick={submitDecision} disabled={!dialog.comment.trim()}
                className="px-3 py-1.5 rounded-md bg-blue-950 text-white hover:bg-blue-900 disabled:opacity-60">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
