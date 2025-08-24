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
import { Toaster } from "react-hot-toast";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";

/** Helpers */
const isAdminUser = (user) =>
  !!user &&
  (user.role === "ADMIN" ||
    (Array.isArray(user.roles) &&
      (user.roles.includes("ROLE_ADMIN") || user.roles.includes("ADMIN"))));

/** Require auth for any route */
function RequireAuth({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

/** Only admins can open */
function RequireAdmin({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  return isAdminUser(user) ? children : <Navigate to="/" state={{ from: loc }} replace />;
}

/** Root gate */
function RootGate() {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return isAdminUser(user) ? <Navigate to="/admin" replace /> : <HomePage />;
}

/** Login gate */
function LoginGate() {
  const { token, user } = useAuth();
  if (token) return <Navigate to={isAdminUser(user) ? "/admin" : "/"} replace />;
  return <Login />;
}



export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClaimsProvider>
          <div className="flex flex-col min-h-screen">
            <NavBar />
            <main className="flex-1">
              <Routes>
                {/* Public (guarded so authed users don't see login again) */}
                <Route path="/login" element={<LoginGate />} />

                {/* Signup is ADMIN-ONLY */}
                <Route
                  path="/signup"
                  element={
                    <RequireAuth>
                      <RequireAdmin>
                        <Signup />
                      </RequireAdmin>
                    </RequireAuth>
                  }
                />

                {/* Protected user routes */}
                <Route
                  path="/create"
                  element={
                    <RequireAuth>
                      <CreateClaim />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/pending"
                  element={
                    <RequireAuth>
                      <PendingClaims />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/closed"
                  element={
                    <RequireAuth>
                      <ClosedClaims />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <RequireAuth>
                      <Profile />
                    </RequireAuth>
                  }
                />

                {/* Admin only */}
                <Route
                  path="/admin"
                  element={
                    <RequireAuth>
                      <RequireAdmin>
                        <AdminDashboard />
                      </RequireAdmin>
                    </RequireAuth>
                  }
                />

                {/* Home */}
                <Route path="/" element={<RootGate />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster position="top-right" reverseOrder={false} />
        </ClaimsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
