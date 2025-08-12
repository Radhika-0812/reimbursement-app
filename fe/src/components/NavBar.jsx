import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function NavBar({ title = "Reimbursement Portal", className = "" }) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const showNavLinks = location.pathname !== "/login" && location.pathname !== "/signup";

  useEffect(() => {
    const handle = (e) => {
      if (!open) return;
      if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const esc = (e) => (e.key === "Escape") && (setOpen(false), setMenuOpen(false));
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handle); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <header className={`w-full bg-blue-950 shadow-sm ${className}`}>
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/")} className="text-lg sm:text-xl font-semibold text-white">
              {title}
            </button>
            {showNavLinks && (
              <div className="hidden md:flex items-center gap-4">
                <button onClick={() => navigate("/")} className="text-white hover:text-gray-300">Home</button>
                <button onClick={() => navigate("/create-claim")} className="text-white hover:text-gray-300">New Claim</button>
                <button onClick={() => navigate("/pending-claims")} className="text-white hover:text-gray-300">Pending Claims</button>
                <button onClick={() => navigate("/closed-claims")} className="text-white hover:text-gray-300">Closed Claims</button>
              </div>
            )}
          </div>

          {showNavLinks && (
            <div className="flex items-center gap-2">
              <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 text-white hover:bg-white/10 rounded-md">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>

              <div className="relative">
                <button ref={btnRef} onClick={() => setOpen(o => !o)} className="flex items-center gap-2 rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <img src={"https://png.pngtree.com/png-vector/20191110/ourmid/pngtree-avatar-icon-profile-icon-member-login-vector-isolated-png-image_1978396.jpg"} alt="User avatar" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover" />
                  <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-gray-300 transition-transform ${open ? "rotate-180" : ""}`}>
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/>
                  </svg>
                </button>

                {open && (
                  <div ref={menuRef} className="absolute right-0 z-50 mt-2 w-48 rounded-xl bg-white p-1.5 shadow-lg">
                    <button onClick={() => { setOpen(false); navigate("/profile"); }} className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
                      View My Profile
                    </button>
                    <button onClick={() => { setOpen(false); logout(); navigate("/login"); }} className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-rose-50">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showNavLinks && menuOpen && (
          <div className="md:hidden pb-3">
            <div className="flex flex-col gap-2 pt-2">
              <button onClick={() => { setMenuOpen(false); navigate("/"); }} className="text-white text-left">Home</button>
              <button onClick={() => { setMenuOpen(false); navigate("/create-claim"); }} className="text-white text-left">New Claim</button>
              <button onClick={() => { setMenuOpen(false); navigate("/pending-claims"); }} className="text-white text-left">Pending Claims</button>
              <button onClick={() => { setMenuOpen(false); navigate("/closed-claims"); }} className="text-white text-left">Closed Claims</button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
