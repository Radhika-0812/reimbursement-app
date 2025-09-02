// src/components/SideBar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

// Feather icons via react-icons
import {
  FiHome,
  FiPlus,
  FiClock,
  FiCheckCircle,
  FiChevronDown,
  FiMenu,
  FiX,
  FiUserPlus,
  FiUpload,
} from "react-icons/fi";

/* Desktop nav item */
const Item = ({ to, icon, children, onClick }) => (
  <NavLink
    to={to}
    end
    onClick={onClick}
    className="flex items-center gap-3 px-4 py-3 rounded-[1.25rem] transition select-none hover:bg-[var(--sidebar-accent)]"
    style={({ isActive }) => ({
      background: isActive ? "var(--sidebar-primary)" : "transparent",
      color: isActive
        ? "var(--sidebar-primary-foreground)"
        : "var(--sidebar-foreground)",
      boxShadow: isActive ? "var(--shadow-sm)" : "none",
    })}
  >
    {icon ? <span className="opacity-90 text-xl leading-none">{icon}</span> : null}
    <span className="font-medium">{children}</span>
  </NavLink>
);

/* Drawer nav item (same look, tighter padding) */
const DrawerItem = ({ to, icon, children, onClick }) => (
  <NavLink
    to={to}
    end
    onClick={onClick}
    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition select-none hover:bg-[var(--sidebar-accent)]"
    style={({ isActive }) => ({
      background: isActive ? "var(--sidebar-primary)" : "transparent",
      color: isActive
        ? "var(--sidebar-primary-foreground)"
        : "var(--sidebar-foreground)",
    })}
  >
    {icon ? <span className="opacity-90 text-lg leading-none">{icon}</span> : null}
    <span className="font-medium">{children}</span>
  </NavLink>
);

export default function Sidebar({ title = "Reimbursement Portal" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [acctOpen, setAcctOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const acctBtnRef = useRef(null);
  const acctMenuRef = useRef(null);

  /* show on all pages except /login */
  const showNav = useMemo(() => location.pathname !== "/login", [location.pathname]);

  /* Admin? */
  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (user.role && String(user.role).toUpperCase().includes("ADMIN")) return true;
    if (Array.isArray(user.roles)) {
      return user.roles.some((r) => String(r).toUpperCase().includes("ADMIN"));
    }
    return false;
  }, [user]);

  /* Click-away + ESC for account menu/drawer */
  useEffect(() => {
    const onDoc = (e) => {
      if (
        acctOpen &&
        acctMenuRef.current &&
        !acctMenuRef.current.contains(e.target) &&
        acctBtnRef.current &&
        !acctBtnRef.current.contains(e.target)
      ) {
        setAcctOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setAcctOpen(false);
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [acctOpen]);

  if (!showNav) return null;

  const displayName =
    (user && (user.name || user.username || user.fullName || user.email)) || "User";

  /* Desktop menus */
  const UserMenu = () => (
    <nav className="space-y-2">
      <Item to="/"        icon={<FiHome        size={20} />}>Home</Item>
      <Item to="/create"  icon={<FiPlus        size={20} />}>New Claim</Item>
      <Item to="/pending" icon={<FiClock       size={20} />}>Pending Claims</Item>
      <Item to="/closed"  icon={<FiCheckCircle size={20} />}>Closed Claims</Item>
    </nav>
  );

  // Admin-only: Admin Home + New Employee (+ optional Upload)
  const AdminMenu = () => (
    <nav className="space-y-2">
      <Item to="/admin"  icon={<FiHome     size={20} />}>Admin Home</Item>
      <Item to="/signup" icon={<FiUserPlus size={20} />}>New Employee</Item>
      {/* <Item to="/admin/upload" icon={<FiUpload size={20} />}>Upload Program</Item> */}
    </nav>
  );

  /* Drawer menus (mobile) */
  const UserDrawer = ({ onNavigate }) => (
    <nav className="space-y-1.5">
      <DrawerItem to="/"        icon={<FiHome        size={18} />} onClick={onNavigate}>Home</DrawerItem>
      <DrawerItem to="/create"  icon={<FiPlus        size={18} />} onClick={onNavigate}>New Claim</DrawerItem>
      <DrawerItem to="/pending" icon={<FiClock       size={18} />} onClick={onNavigate}>Pending Claims</DrawerItem>
      <DrawerItem to="/closed"  icon={<FiCheckCircle size={18} />} onClick={onNavigate}>Closed Claims</DrawerItem>
    </nav>
  );

  const AdminDrawer = ({ onNavigate }) => (
    <nav className="space-y-1.5">
      <DrawerItem to="/admin"  icon={<FiHome     size={18} />} onClick={onNavigate}>Admin Home</DrawerItem>
      <DrawerItem to="/signup" icon={<FiUserPlus size={18} />} onClick={onNavigate}>New Employee</DrawerItem>
      {/* <DrawerItem to="/admin/upload" icon={<FiUpload size={18} />} onClick={onNavigate}>Upload Program</DrawerItem> */}
    </nav>
  );

  return (
    <>
      {/* ───────── Desktop: fixed sidebar ───────── */}
      <aside
        className="max-md:hidden md:flex w-72 shrink-0 flex-col p-5 sticky md:top-6 ml-6 mr-6 my-6 rounded-[1.25rem] overflow-y-auto"
        style={{
          background: "var(--sidebar)",
          color: "var(--sidebar-foreground)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Brand */}
        <button
          onClick={() => navigate(isAdmin ? "/admin" : "/")}
          className="text-left font-semibold text-lg mb-6 truncate"
          title={title}
          style={{ color: "var(--sidebar-foreground)" }}
        >
          {title}
        </button>

        {/* Profile */}
        <div className="mb-6">
          <p className="font-medium truncate" style={{ color: "var(--sidebar-foreground)" }}>
            {displayName}
          </p>
        </div>

        {/* Menu */}
        {isAdmin ? <AdminMenu /> : <UserMenu />}

        {/* Account */}
        <div className="mt-auto pt-6" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div>
            <button
              ref={acctBtnRef}
              onClick={() => setAcctOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition"
              title="Account"
              style={{
                color: "var(--sidebar-foreground)",
                background: "transparent",
              }}
            >
              <span>Account</span>
              <FiChevronDown
                className={`h-4 w-4 transition-transform ${acctOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {acctOpen && (
            <div
              ref={acctMenuRef}
              className="mt-2 w-full rounded-lg overflow-hidden shadow border"
              style={{
                background: "var(--card)",
                color: "var(--foreground)",
                borderColor: "var(--border)",
              }}
            >
              {!isAdmin && (
                <button
                  onClick={() => { setAcctOpen(false); navigate("/profile"); }}
                  className="block w-full text-left px-4 py-2 hover:bg-[var(--sidebar-accent)]"
                >
                  View My Profile
                </button>
              )}
              <button
                onClick={() => { setAcctOpen(false); logout(); navigate("/login"); }}
                className="block w-full text-left px-4 py-2 hover:bg-[var(--sidebar-accent)]"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ───────── Mobile: tiny header + compact drawer ───────── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-30 h-12 flex items-center justify-between px-3 border-b"
        style={{
          background: "var(--sidebar)",
          color: "var(--sidebar-foreground)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="p-1 -ml-1">
          <FiMenu className="h-6 w-6" />
        </button>

        <button
          onClick={() => navigate(isAdmin ? "/admin" : "/")}
          className="text-sm font-semibold truncate"
          title={title}
          style={{ color: "var(--sidebar-foreground)" }}
        >
          {title}
        </button>

        <div className="w-6" /> {/* spacer */}
      </header>

      {/* Push page content below the small header on mobile */}
      <div className="md:hidden h-12" />

      {/* Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgb(0 0 0 / 0.4)" }} />
          <div
            className="absolute top-0 left-0 h-full w-64 max-w-[80vw] p-4 flex flex-col gap-3 rounded-r-2xl overflow-y-auto border-r"
            style={{
              background: "var(--sidebar)",
              color: "var(--sidebar-foreground)",
              borderColor: "var(--sidebar-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: "var(--sidebar-foreground)" }}>
                {displayName}
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="p-1"
                style={{ color: "var(--sidebar-foreground)" }}
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* Menu */}
            {isAdmin ? (
              <AdminDrawer onNavigate={() => setDrawerOpen(false)} />
            ) : (
              <UserDrawer onNavigate={() => setDrawerOpen(false)} />
            )}

            {/* Account */}
            <div className="mt-auto pt-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
              {!isAdmin && (
                <button
                  onClick={() => { setDrawerOpen(false); navigate("/profile"); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[var(--sidebar-accent)]"
                >
                  View My Profile
                </button>
              )}
              <button
                onClick={() => { setDrawerOpen(false); logout(); navigate("/login"); }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[var(--sidebar-accent)]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
