import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { ClaimsProvider } from "./state/ClaimsContext";
import NavBar from "./components/NavBar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreateClaim from "./pages/CreateClaim";
import AdminDashboard from "./pages/AdminDashboard";
import PendingClaims from "./pages/PendingClaims";
import ClosedClaims from "./pages/ClosedClaims";
import Profile from "./pages/Profile";

// Simple protected wrapper (token presence)
function Protected({ children }) {
  const isAuthed = !!localStorage.getItem("token");
  return isAuthed ? children : <Navigate to="/login" replace />;
}

// Gate home: admins → /admin, others → welcome/home
function HomeGate() {
  const { user } = useAuth();
  const isAdmin = !!user && (
    user.role === "ADMIN" ||
    (Array.isArray(user.roles) && (user.roles.includes("ROLE_ADMIN") || user.roles.includes("ADMIN")))
  );
  return isAdmin ? <Navigate to="/admin" replace /> : <div className="p-6">Welcome</div>;
}

// Only admins can open /admin
function RequireAdmin({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  const isAdmin = !!user && (
    user.role === "ADMIN" ||
    (Array.isArray(user.roles) && (user.roles.includes("ROLE_ADMIN") || user.roles.includes("ADMIN")))
  );
  return isAdmin ? children : <Navigate to="/" state={{ from: loc }} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClaimsProvider>
          <NavBar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/create"  element={<Protected><CreateClaim /></Protected>} />
            <Route path="/pending" element={<Protected><PendingClaims /></Protected>} />
            <Route path="/closed"  element={<Protected><ClosedClaims /></Protected>} />
            <Route path="/profile" element={<Protected><Profile /></Protected>} />

            {/* Admin only */}
            <Route path="/admin" element={<Protected><RequireAdmin><AdminDashboard /></RequireAdmin></Protected>} />

            {/* Home gate: admins auto → /admin */}
            <Route path="/" element={<HomeGate />} />
          </Routes>
        </ClaimsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
