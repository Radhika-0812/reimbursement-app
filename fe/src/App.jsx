// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { ClaimsProvider } from "./state/ClaimsContext";
import { DateFilterProvider } from "./state/DateFilterContext";     // ⬅️ NEW              // ⬅️ NEW
import { ToastViewport } from "./lib/toast";                      // ⬅️ NEW

import Sidebar from "./components/SideBar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreateClaim from "./pages/CreateClaim";
import AdminDashboard from "./pages/AdminDashboard";
import PendingClaims from "./pages/PendingClaims";
import ClosedClaims from "./pages/ClosedClaims";
import Profile from "./pages/Profile";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import EditClaim from "./pages/EditClaim";

/** Helpers */
const isAdminUser = (user) =>
  !!user &&
  (user.role === "ADMIN" ||
    (Array.isArray(user.roles) &&
      (user.roles.includes("ROLE_ADMIN") || user.roles.includes("ADMIN"))));

function RequireAuth({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}
function RequireAdmin({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  return isAdminUser(user) ? children : <Navigate to="/" state={{ from: loc }} replace />;
}
function RootGate() {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return isAdminUser(user) ? <Navigate to="/admin" replace /> : <HomePage />;
}
function LoginGate() {
  const { token, user } = useAuth();
  if (token) return <Navigate to={isAdminUser(user) ? "/admin" : "/"} replace />;
  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <DateFilterProvider>
        <AuthProvider>
            <ClaimsProvider>
              {/* Pops up once after login to pick India/Malaysia */}
           

              <div
                className="min-h-screen flex flex-col font-jakarta"
                style={{ background: "var(--background)", color: "var(--night)" }}
              >
                {/* mobile header spacer so content clears the fixed header in Sidebar */}
                <div className="md:hidden h-12" />

                <div className="flex flex-1">
                  <Sidebar />

                  {/* Main column (fills space next to sidebar) */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <main className="flex-1 px-6 py-6">
                      <Routes>
                        <Route path="/login" element={<LoginGate />} />

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
                        <Route
                          path="/create"
                          element={
                            <RequireAuth>
                              <CreateClaim />
                            </RequireAuth>
                          }
                        />
                        <Route path="/claims/:id/edit" element={<EditClaim />} />
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
                        <Route path="/" element={<RootGate />} />
                      </Routes>
                    </main>

                    <Footer />
                  </div>
                </div>
              </div>

              {/* Global toast viewport */}
              <ToastViewport />
            </ClaimsProvider>
        </AuthProvider>
      </DateFilterProvider>
    </BrowserRouter>
  );
}
