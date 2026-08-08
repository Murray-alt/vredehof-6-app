import type { Metadata } from "next";
import { DashboardLayout } from "@/components/dashboard-layout";
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
          <DashboardLayout user={user}>{children}</DashboardLayout>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
