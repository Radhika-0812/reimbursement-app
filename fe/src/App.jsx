import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./state/AuthContext";
import { ClaimsProvider } from "./state/ClaimsContext";
import { ProtectedRoute } from "./routes/ProtectedRoutes";

import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import CreateClaim from "./pages/CreateClaim";
import PendingClaims from "./pages/PendingClaims";
import ClosedClaims from "./pages/ClosedClaims";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Signup from "./pages/signUp";
import React from "react";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClaimsProvider>
          {/* Auth pages (no navbar) */}
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* App pages (with navbar) */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<HomePage />} />
              <Route path="/create-claim" element={<CreateClaim />} />
              <Route path="/pending-claims" element={<PendingClaims />} />
              <Route path="/closed-claims" element={<ClosedClaims />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ClaimsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { Outlet } from "react-router-dom";
function Layout() {
  return (
    <>
      
      <Outlet />
    </>
  );
}
