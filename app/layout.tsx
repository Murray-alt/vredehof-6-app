import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vredehof 6 Ledger",
  description: "Owner-managed rental property ledger for Vredehof 6."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="app-shell">
            <aside className="sidebar">
              <div className="brand-card panel">
                <div className="brand-mark">V6</div>
                <div className="grid" style={{ gap: 6 }}>
                  <strong className="brand-title">Vredehof 6</strong>
                  <span className="muted">Shared property ledger</span>
                </div>
              </div>

              <div className="panel sidebar-panel">
                <div className="sidebar-heading">Workspace</div>
                <nav className="sidebar-nav">
                  <Link href="/" className="nav-link ghost">Dashboard</Link>
                  <Link href="/ledger" className="nav-link ghost">Ledger</Link>
                  <Link href="/reports" className="nav-link ghost">Reports</Link>
                  {user.role_code === "owner_admin" ? (
                    <>
                      <Link href="/imports" className="nav-link ghost">Imports</Link>
                      <Link href="/categories" className="nav-link ghost">Categories</Link>
                    </>
                  ) : null}
                </nav>
              </div>

              <div className="panel sidebar-panel">
                <div className="sidebar-heading">Access</div>
                <div className="grid" style={{ gap: 10 }}>
                  <div>
                    <strong>{user.display_name}</strong>
                    <div className="muted">
                      Signed in as{" "}
                      <span className={`pill ${user.role_code === "stakeholder_viewer" ? "viewer" : ""}`}>
                        {user.role_code === "owner_admin" ? "Owner admin" : "Stakeholder viewer"}
                      </span>
                    </div>
                  </div>
                  <form action="/auth/logout" method="post">
                    <button type="submit" className="secondary full-width">Sign out</button>
                  </form>
                </div>
              </div>
            </aside>

            <div className="content-area">
              <header className="content-header">
                <div>
                  <p className="eyebrow">Property dashboard</p>
                  <h1 className="page-title">Vredehof 6 financial overview</h1>
                </div>
                <div className="header-glow" aria-hidden="true" />
              </header>
              <div className="shell">
                {children}
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
