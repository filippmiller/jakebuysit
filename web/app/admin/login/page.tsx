"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, ArrowRight } from "lucide-react";
import { useAdminAuthStore } from "@/lib/admin-auth-store";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize, isLoading } = useAdminAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { initialize(); }, [initialize]);
  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/admin");
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0908] relative overflow-hidden flex items-center justify-center">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
            <Shield className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-[#f5f0e8] mb-2">Admin Access</h1>
          <p className="text-[#706557]">JakeBuysIt Control Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.05] border border-white/[0.1] rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 border-l-4 border-l-red-500 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-5">
            <label htmlFor="email" className="block text-sm font-semibold text-[#c3bbad] mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#706557]" />
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@jakebuysit.com"
                className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-colors" />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-semibold text-[#c3bbad] mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#706557]" />
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-colors" />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2">
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Sign In <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
