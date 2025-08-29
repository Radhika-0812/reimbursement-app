import Sidebar from "../SideBar";
import Footer from "../Footer";

export default function AppShell({ children, title = "Reimbursement Portal" }) {
  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <Sidebar title={title} />

      {/* main column beside the sidebar */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* one container controls spacing; full width (no max-w / mx-auto) */}
        <main className="flex-1 px-6 py-6">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
