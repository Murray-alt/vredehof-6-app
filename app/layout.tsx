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
          <div className="shell">
            <div className="nav panel">
              <div>
                <strong>Vredehof 6 Ledger</strong>
                <div className="muted">
                  Signed in as {user.display_name} <span className={`pill ${user.role_code === "stakeholder_viewer" ? "viewer" : ""}`}>{user.role_code === "owner_admin" ? "Owner admin" : "Stakeholder viewer"}</span>
                </div>
              </div>

              <div className="nav-links">
                <Link href="/" className="nav-link ghost">Dashboard</Link>
                <Link href="/ledger" className="nav-link ghost">Ledger</Link>
                <Link href="/reports" className="nav-link ghost">Reports</Link>
                {user.role_code === "owner_admin" ? (
                  <>
                    <Link href="/imports" className="nav-link ghost">Imports</Link>
                    <Link href="/categories" className="nav-link ghost">Categories</Link>
                  </>
                ) : null}
                <form action="/auth/logout" method="post">
                  <button type="submit" className="secondary">Sign out</button>
                </form>
              </div>
            </div>
            {children}
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
