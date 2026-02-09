"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Package, DollarSign, Truck, Users, AlertTriangle,
  Shield, Settings, FileText, BarChart3, ClipboardCheck, LogOut, Menu, X,
  ChevronRight,
} from "lucide-react";
import { useAdminAuthStore } from "@/lib/admin-auth-store";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/offers", label: "Offers", icon: Package },
  { href: "/admin/payouts", label: "Payouts", icon: DollarSign },
  { href: "/admin/shipments", label: "Shipments", icon: Truck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/escalations", label: "Escalations", icon: AlertTriangle },
  { href: "/admin/fraud", label: "Fraud", icon: Shield },
  { href: "/admin/verifications", label: "Verifications", icon: ClipboardCheck },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit Log", icon: FileText },
  { href: "/admin/config", label: "Config", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, initialize, logout } = useAdminAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Login page has its own layout
  if (pathname === "/admin/login") return <>{children}</>;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#0a0908] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-64
        bg-[#0f0d0a] border-r border-white/[0.08]
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/[0.08]">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-[#0f0d0a] font-bold text-sm">
              JB
            </div>
            <span className="text-[#f5f0e8] font-semibold text-lg tracking-tight">Admin</span>
          </Link>
          <button className="ml-auto lg:hidden text-[#706557] hover:text-[#f5f0e8]" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive(href)
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-[#a89d8a] hover:text-[#f5f0e8] hover:bg-white/[0.04]"
                }
              `}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {label}
              {isActive(href) && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-white/[0.08] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#f5f0e8] font-medium truncate">{user?.name || user?.email}</p>
              <p className="text-xs text-[#706557] capitalize">{user?.role?.replace("_", " ")}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push("/admin/login"); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#706557] hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 border-b border-white/[0.08] bg-[#0a0908]/80 backdrop-blur-md flex items-center px-4 lg:px-8 sticky top-0 z-30">
          <button className="lg:hidden mr-4 text-[#706557] hover:text-[#f5f0e8]" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-[#f5f0e8]">
            {navItems.find((n) => isActive(n.href))?.label || "Admin"}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
