"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { BarChart3, Brain, TrendingUp, DollarSign } from "lucide-react";

function StatCard({ label, value, sub, color = "amber" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
      <p className="text-xs text-[#706557]">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color === "green" ? "text-emerald-400" : color === "blue" ? "text-blue-400" : "text-amber-400"}`}>{value}</p>
      {sub && <p className="text-xs text-[#706557] mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [ai, setAi] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getAiAccuracy(), adminApi.getRevenue()])
      .then(([a, r]) => { setAi(a); setRevenue(r); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8">
      {/* AI Accuracy */}
      <div>
        <h2 className="text-lg font-semibold text-[#f5f0e8] mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" /> AI Accuracy
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard label="Escalation Rate" value={`${ai?.escalationStats?.escalation_rate || 0}%`} color="amber"
            sub={`${ai?.escalationStats?.escalated || 0} of ${ai?.escalationStats?.total || 0}`} />
          {ai?.confidenceDistribution?.map((d: any) => (
            <StatCard key={d.range} label={`Confidence ${d.range}`} value={d.count} color="blue"
              sub={`Avg: ${d.avg_confidence}%`} />
          ))}
        </div>

        {/* Category Breakdown */}
        {ai?.categoryBreakdown?.length > 0 && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4">Category Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-[#706557] border-b border-white/[0.08]">
                  <th className="text-left py-2 px-3">Category</th>
                  <th className="text-left py-2 px-3">Count</th>
                  <th className="text-left py-2 px-3">Avg Confidence</th>
                  <th className="text-left py-2 px-3">Escalated</th>
                </tr></thead>
                <tbody>
                  {ai.categoryBreakdown.map((c: any) => (
                    <tr key={c.item_category} className="border-b border-white/[0.04]">
                      <td className="py-2 px-3 text-[#f5f0e8]">{c.item_category}</td>
                      <td className="py-2 px-3 text-[#c3bbad]">{c.count}</td>
                      <td className="py-2 px-3 text-[#c3bbad]">{c.avg_confidence}%</td>
                      <td className="py-2 px-3 text-[#c3bbad]">{c.escalated_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Revenue */}
      <div>
        <h2 className="text-lg font-semibold text-[#f5f0e8] mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" /> Revenue & Conversions
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Offers" value={revenue?.conversionStats?.total || 0} color="blue" />
          <StatCard label="Accepted" value={revenue?.conversionStats?.accepted || 0} color="green" />
          <StatCard label="Declined" value={revenue?.conversionStats?.declined || 0} color="amber" />
          <StatCard label="Conversion Rate" value={`${revenue?.conversionStats?.conversion_rate || 0}%`} color="green" />
        </div>

        {/* Daily Metrics */}
        {revenue?.dailyMetrics?.length > 0 && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4">Last 30 Days</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-[#706557] border-b border-white/[0.08]">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Created</th>
                  <th className="text-left py-2 px-3">Accepted</th>
                  <th className="text-left py-2 px-3">Total Value</th>
                </tr></thead>
                <tbody>
                  {revenue.dailyMetrics.slice(0, 14).map((d: any) => (
                    <tr key={d.date} className="border-b border-white/[0.04]">
                      <td className="py-2 px-3 text-[#f5f0e8]">{new Date(d.date).toLocaleDateString()}</td>
                      <td className="py-2 px-3 text-[#c3bbad]">{d.offers_created}</td>
                      <td className="py-2 px-3 text-emerald-400">{d.accepted}</td>
                      <td className="py-2 px-3 text-amber-400">${d.total_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Category Revenue */}
        {revenue?.categoryRevenue?.length > 0 && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 mt-4">
            <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4">Revenue by Category</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-[#706557] border-b border-white/[0.08]">
                  <th className="text-left py-2 px-3">Category</th>
                  <th className="text-left py-2 px-3">Offers</th>
                  <th className="text-left py-2 px-3">Total Value</th>
                  <th className="text-left py-2 px-3">Avg Offer</th>
                </tr></thead>
                <tbody>
                  {revenue.categoryRevenue.map((c: any) => (
                    <tr key={c.item_category} className="border-b border-white/[0.04]">
                      <td className="py-2 px-3 text-[#f5f0e8]">{c.item_category}</td>
                      <td className="py-2 px-3 text-[#c3bbad]">{c.total_offers}</td>
                      <td className="py-2 px-3 text-amber-400">${c.total_value}</td>
                      <td className="py-2 px-3 text-[#c3bbad]">${c.avg_offer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
