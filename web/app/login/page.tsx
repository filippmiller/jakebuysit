"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize, isLoading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong, partner.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Don't render form while checking stored auth
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0f0d0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0d0a] relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-400/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 pt-24 pb-12 px-4 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.07] border border-white/[0.12] mb-5">
              <LogIn className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#f5f0e8] mb-2">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
                partner
              </span>
            </h1>
            <p className="text-[#a89d8a] text-lg">
              Sign in and let&apos;s get back to business
            </p>
          </div>

          {/* Form Card */}
          <form
            onSubmit={handleSubmit}
            className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 sm:p-8"
          >
            {/* Error Banner */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 border-l-4 border-l-red-500 rounded-lg backdrop-blur-sm">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="mb-5">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[#c3bbad] mb-2"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#706557]" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[#c3bbad] mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#706557]" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your secret passphrase"
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-[#1a1510] font-semibold rounded-lg transition-all shadow-[0_4px_16px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_24px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#1a1510] border-t-transparent rounded-full animate-spin" />
                  Signin&apos; in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/[0.1]" />
              <span className="text-xs text-[#706557] uppercase tracking-wider">
                New around here?
              </span>
              <div className="flex-1 h-px bg-white/[0.1]" />
            </div>

            {/* Register Link */}
            <Link
              href="/register"
              className="block w-full py-3 text-center border border-white/[0.12] hover:border-amber-500/30 bg-white/[0.03] hover:bg-white/[0.06] text-[#f5f0e8] font-medium rounded-lg transition-all"
            >
              Create an Account
            </Link>
          </form>
        </div>
      </div>
    </main>
  );
}
