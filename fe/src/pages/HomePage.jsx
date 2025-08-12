import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { useClaims } from "../state/ClaimsContext";
import NavBar from "../components/NavBar";

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { claims } = useClaims();

  let pendingCount = 0;
  if (user.role === "employee") {
    pendingCount = claims.filter(c =>
      c.userId === user.id && (c.status === "pending_manager" || c.status === "pending_finance")
    ).length;
  } else if (user.role === "manager") {
    pendingCount = claims.filter(c => c.status === "pending_manager" && c.managerId === user.id).length;
  } else if (user.role === "finance") {
    pendingCount = claims.filter(c => c.status === "pending_finance").length;
  } else if (user.role === "admin") {
    pendingCount = claims.filter(c => c.status === "pending_manager" || c.status === "pending_finance").length;
  }

  const closedCount =
    user.role === "admin"
      ? claims.filter(c => c.status === "closed").length
      : claims.filter(c => c.status === "closed" && c.userId === user.id).length;

  return (
    <div><NavBar />
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="mx-auto max-w-6xl w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
          <div className="border border-blue-950 rounded-lg p-6 flex flex-col items-center justify-center min-h-40 sm:min-h-48">
            <button onClick={() => navigate("/create-claim")}
              className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-blue-950 text-white text-3xl shadow hover:bg-blue-900 transition">+</button>
            <div className="mt-4 font-medium text-sm sm:text-base">Create New Claim</div>
          </div>

          <div className="border border-blue-950 rounded-lg p-6 flex flex-col items-center justify-center min-h-40 sm:min-h-48">
            <button onClick={() => navigate("/pending-claims")}
              className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-yellow-500 text-white text-xl sm:text-2xl shadow hover:bg-yellow-600 transition">{pendingCount}</button>
            <div className="mt-4 font-medium text-sm sm:text-base">Pending Claims</div>
          </div>

          <div className="border border-blue-950 rounded-lg p-6 flex flex-col items-center justify-center min-h-40 sm:min-h-48">
            <button onClick={() => navigate("/closed-claims")}
              className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-green-500 text-white text-xl sm:text-2xl shadow hover:bg-green-600 transition">{closedCount}</button>
            <div className="mt-4 font-medium text-sm sm:text-base">Closed Claims</div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
