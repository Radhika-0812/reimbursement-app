// src/routes/ProtectedRoutes.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

function Loading() {
  return <div style={{ height: "40vh" }} />; // swap for a spinner if you want
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return user.role === "admin" ? children : <Navigate to="/" replace />;
}

/** Use for role-gated pages:
 * <RoleRoute roles={['manager','finance']}><Page/></RoleRoute>
 */
export function RoleRoute({ roles = [], children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

/** Optional: prevent logged-in users from seeing /login */
export function UnauthRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  return user ? <Navigate to={(location.state?.from?.pathname) || "/"} replace /> : children;
}
