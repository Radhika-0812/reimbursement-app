// src/components/SideBar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { C_NIGHT,C_CHAR,C_CLOUD,C_GUN,C_SLATE,C_STEEL } from "../theme/palette";

/** ─────────────────────────  PALETTE  ───────────────────────── **/

export const C_OFFEE    = C_NIGHT;   // sidebar bg, headings
export const C_COCOA    = C_GUN;    // primary buttons
export const C_TAUPE    = C_CHAR;   // secondary accents
export const C_LINEN    = C_SLATE;   // borders / subtle text
export const C_EGGSHELL = C_STEEL;   // app bg / light text on dark
export const C_CARD = C_CLOUD;
/** Nav item pill */
const Item = ({ to, icon, children, onClick }) => (
  <NavLink
    to={to}
    end
    onClick={onClick}
    className={({ isActive }) =>
      [
        "flex items-center gap-3 px-4 py-3 rounded-[1.25rem] transition select-none",
        isActive
          ? "bg-white/10 text-white shadow"
          : "text-white/80 hover:text-white hover:bg-white/5",
      ].join(" ")
    }
  >
    {icon ? <span className="opacity-80">{icon}</span> : null}
    <span className="font-medium">{children}</span>
  </NavLink>
);

export default function Sidebar({ title = "Reimbursement Portal" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const acctBtnRef = useRef(null);
  const acctMenuRef = useRef(null);

  /** hide sidebar on auth pages */
  const showNav = useMemo(
    () => !(location.pathname === "/login" || location.pathname === "/signup"),
    [location.pathname]
  );

  /** detect admin */
  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (user.role && String(user.role).toUpperCase().includes("ADMIN")) return true;
    if (Array.isArray(user.roles)) {
      return user.roles.some(r => String(r).toUpperCase().includes("ADMIN"));
    }
    return false;
  }, [user]);

  /** optional: auto-redirect admin to /admin landing */
  useEffect(() => {
    if (!showNav) return;
    if (isAdmin && !location.pathname.startsWith("/admin")) {
      // navigate("/admin", { replace: true });
    }
  }, [isAdmin, showNav, location.pathname, navigate]);

  /** click-away + esc close */
  useEffect(() => {
    const onDoc = (e) => {
      if (!acctOpen) return;
      if (
        acctMenuRef.current &&
        !acctMenuRef.current.contains(e.target) &&
        acctBtnRef.current &&
        !acctBtnRef.current.contains(e.target)
      ) {
        setAcctOpen(false);
      }
    };
    const onEsc = (e) => e.key === "Escape" && (setAcctOpen(false), setDrawerOpen(false));
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [acctOpen]);

  if (!showNav) return null;

  /** shared menu (user vs admin) */
  const Menu = ({ onNavigate }) =>
    !isAdmin ? (
      <nav className="space-y-2">
        <Item to="/" icon="🏠" onClick={onNavigate}>Home</Item>
        <Item to="/create" icon="➕" onClick={onNavigate}>New Claim</Item>
        <Item to="/pending" icon="⏳" onClick={onNavigate}>Pending Claims</Item>
        <Item to="/closed" icon="✅" onClick={onNavigate}>Closed Claims</Item>
      </nav>
    ) : (
      <div className="space-y-2">
        <button
          onClick={() => { onNavigate?.(); navigate("/signup"); }}
          className="w-full px-4 py-3 rounded-[1.25rem] font-medium text-white"
          style={{ background: C_COCOA }}
        >
          Create Employee
        </button>
      </div>
    );

  const DisplayName =
    (user && (user.name || user.username || user.fullName || user.email)) || "User";

  return (
    <>
      {/* ───────────── Desktop sidebar ───────────── */}
      <aside
        className="hidden md:flex w-72 shrink-0 flex-col p-5 sticky top-0 h-screen"
        style={{ background: C_OFFEE, boxShadow: "0 10px 24px rgba(41,28,14,.12)" }}
      >
        {/* Brand */}
        <button
          onClick={() => navigate(isAdmin ? "/admin" : "/")}
          className="text-left text-white font-semibold text-lg mb-6"
        >
          {title}
        </button>

        {/* Profile (avatar & online removed; keep name only) */}
        <div className="mb-6">
          <p className="text-white font-medium">{DisplayName}</p>
        </div>

        {/* Menu */}
        <Menu />

        {/* Account */}
        <div className="mt-auto pt-6 border-t border-white/10">
          <button
            ref={acctBtnRef}
            onClick={() => setAcctOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-white/90 hover:bg-white/5"
          >
            <span>Account</span>
            <svg viewBox="0 0 20 20" className={`h-4 w-4 ${acctOpen ? "rotate-180" : ""}`} fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/>
            </svg>
          </button>
          {acctOpen && (
            <div ref={acctMenuRef} className="mt-2 bg-white/5 rounded-lg overflow-hidden">
              {!isAdmin && (
                <button
                  onClick={() => { setAcctOpen(false); navigate("/profile"); }}
                  className="w-full text-left px-4 py-2 text-white/90 hover:bg-white/10"
                >
                  View My Profile
                </button>
              )}
              <button
                onClick={() => { setAcctOpen(false); logout(); navigate("/login"); }}
                className="w-full text-left px-4 py-2 text-white/90 hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ───────────── Mobile: top bar + drawer button ───────────── */}
      <header
        className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3"
        style={{ background: C_OFFEE, color: C_EGGSHELL }}
      >
        <button onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <span className="font-semibold">{title}</span>
        <span className="opacity-0 pointer-events-none">.</span>
      </header>

      {/* ───────────── Mobile drawer ───────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute top-0 left-0 h-full w-72 p-5 flex flex-col"
            style={{ background: C_OFFEE }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setDrawerOpen(false); navigate(isAdmin ? "/admin" : "/"); }}
              className="text-left text-white text-lg font-semibold mb-6"
            >
              {title}
            </button>

            <Menu onNavigate={() => setDrawerOpen(false)} />

            <button
              onClick={() => { setDrawerOpen(false); logout(); navigate("/login"); }}
              className="mt-auto text-left px-4 py-3 rounded-[1.25rem] text-white/90 hover:bg-white/5"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}
