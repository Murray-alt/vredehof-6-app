"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BookOpenText,
  Building2,
  ChartColumn,
  FolderInput,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Tags,
  Users,
  X
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";

type DashboardLayoutProps = {
  children: React.ReactNode;
  user: SessionUser;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo<NavItem[]>(() => {
    const base: NavItem[] = [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/ledger", label: "Ledger", icon: BookOpenText },
      { href: "/reports", label: "Reports", icon: ChartColumn }
    ];

    if (user.role_code === "owner_admin") {
      base.push(
        { href: "/imports", label: "Imports", icon: FolderInput },
        { href: "/categories", label: "Categories", icon: Tags }
      );
    }

    return base;
  }, [user.role_code]);

  const currentSection = navItems.find((item) => item.href === pathname)?.label ?? "Overview";

  return (
    <div className={cx("min-h-screen bg-zinc-950 text-zinc-100", mobileOpen && "h-screen overflow-hidden")}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(113,113,122,0.12),transparent_22%),linear-gradient(180deg,#09090b_0%,#111827_45%,#09090b_100%)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-0 px-0 lg:px-6">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-white/10 bg-zinc-950/85 px-5 py-6 backdrop-blur xl:block">
          <SidebarContent currentPath={pathname} navItems={navItems} user={user} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-100 transition hover:border-white/20 hover:bg-white/10 xl:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">Vredehof 6</p>
                    <div className="mt-1 flex items-center gap-3">
                      <h1 className="truncate text-lg font-semibold text-white sm:text-xl">{currentSection}</h1>
                      <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300 sm:inline-flex">
                        Live ledger
                      </span>
                    </div>
                  </div>

                  <form action="/ledger" method="get" className="w-full max-w-xl md:flex-1 md:max-w-md lg:max-w-xl">
                    <label className="sr-only" htmlFor="global-search">
                      Search ledger
                    </label>
                    <div className="flex h-11 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-zinc-300 shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition focus-within:border-sky-400/40 focus-within:bg-white/10">
                      <Search className="h-4 w-4 text-zinc-400" />
                      <input
                        id="global-search"
                        name="search"
                        type="search"
                        placeholder="Search entries, owners, or notes"
                        className="h-full w-full border-0 bg-transparent p-0 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-0"
                      />
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="xl:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="fixed inset-0 z-50 flex flex-col bg-zinc-950 px-5 pb-6 pt-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200/20 to-zinc-400/10 ring-1 ring-white/10">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Vredehof 6</p>
                  <p className="text-xs text-zinc-400">Property ledger</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarContent currentPath={pathname} navItems={navItems} user={user} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function SidebarContent({
  currentPath,
  navItems,
  user,
  onNavigate
}: {
  currentPath: string;
  navItems: NavItem[];
  user: SessionUser;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200/20 to-zinc-400/10 ring-1 ring-white/10">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Vredehof 6</p>
            <p className="text-xs text-zinc-400">Shared property ledger</p>
          </div>
        </div>
      </div>

      <nav className="mt-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cx(
                "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-slate-200/10 text-white ring-1 ring-white/10"
                  : "text-zinc-400 hover:bg-white/[0.045] hover:text-white"
              )}
            >
              <span
                className={cx(
                  "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                  isActive
                    ? "border-white/10 bg-white/10 text-white"
                    : "border-transparent bg-white/[0.04] text-zinc-500 group-hover:border-white/10 group-hover:text-zinc-200"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-zinc-200">
            {user.role_code === "owner_admin" ? <ShieldCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.display_name}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {user.role_code === "owner_admin" ? "Owner admin access" : "Stakeholder viewer access"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
