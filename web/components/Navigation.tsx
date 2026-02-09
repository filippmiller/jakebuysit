"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutDashboard, Camera, LogIn, LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initialize, logout } =
    useAuthStore();

  // Hydrate auth state once on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/submit", label: "Sell", icon: Camera },
  ];

  // Don't show nav on landing page or admin routes
  if (pathname === "/" || pathname.startsWith("/admin")) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-[#0a0908]/90 backdrop-blur-md border-b border-[#1f1b17] z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
              Jake
            </span>
            <span className="font-bold text-lg text-[#f5f0e8]">
              Buys It
            </span>
          </Link>

          {/* Nav Links + Auth */}
          <div className="flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-white/[0.1] border border-white/[0.15] text-amber-400 font-semibold"
                      : "text-[#a89d8a] hover:bg-white/[0.07] hover:text-[#f5f0e8] border border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}

            {/* Separator */}
            <div className="w-px h-6 bg-white/[0.1] mx-2 hidden sm:block" />

            {/* Auth Section */}
            {!isLoading && (
              <>
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-sm text-[#a89d8a] truncate max-w-[140px]">
                      {user.email}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[#a89d8a] hover:bg-white/[0.07] hover:text-red-400 border border-transparent transition-all"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline text-sm">
                        Sign Out
                      </span>
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                      pathname === "/login"
                        ? "bg-white/[0.1] border border-white/[0.15] text-amber-400 font-semibold"
                        : "text-[#a89d8a] hover:bg-white/[0.07] hover:text-[#f5f0e8] border border-transparent"
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">Sign In</span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
