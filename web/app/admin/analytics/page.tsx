"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { BarChart3, Brain, TrendingUp, DollarSign, Clock, Download, Filter } from "lucide-react";
import { TrendChart } from "@/components/analytics/TrendChart";
import { CategoryInsights } from "@/components/analytics/CategoryInsights";
import { BestTimeHeatmap } from "@/components/analytics/BestTimeHeatmap";
import { PriceDistribution } from "@/components/analytics/PriceDistribution";

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
  const [trends, setTrends] = useState<any>(null);
  const [categoryInsights, setCategoryInsights] = useState<any>(null);
  const [bestTime, setBestTime] = useState<any>(null);
  const [priceDistribution, setPriceDistribution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [trendDays, setTrendDays] = useState<number>(30);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [aiData, revenueData, trendsData, insightsData, timeData] = await Promise.all([
        adminApi.getAiAccuracy(),
        adminApi.getRevenue(),
        adminApi.getTrends({ days: trendDays }),
        adminApi.getCategoryInsights(),
        adminApi.getBestTimeToSell(),
      ]);

      setAi(aiData);
      setRevenue(revenueData);
      setTrends(trendsData);
      setCategoryInsights(insightsData);
      setBestTime(timeData);

      // Auto-select first category for price distribution
      if (insightsData?.insights?.length > 0 && !selectedCategory) {
        const firstCategory = insightsData.insights[0].item_category;
        setSelectedCategory(firstCategory);
        loadPriceDistribution(firstCategory);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPriceDistribution = async (category: string) => {
    try {
      const data = await adminApi.getPriceDistribution(category);
      setPriceDistribution(data);
    } catch (error) {
      console.error('Failed to load price distribution:', error);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    loadPriceDistribution(category);
  };

  const handleTrendDaysChange = async (days: number) => {
    setTrendDays(days);
    try {
      const trendsData = await adminApi.getTrends({ days });
      setTrends(trendsData);
    } catch (error) {
      console.error('Failed to update trends:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f5f0e8]">Analytics Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => adminApi.exportAnalytics('trends', { days: trendDays })}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-400 text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Trends
          </button>
          <button
            onClick={() => adminApi.exportAnalytics('category-insights')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-emerald-400 text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Insights
          </button>
        </div>
      </div>

      {/* Market Trends */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#f5f0e8] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" /> Market Trends
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#706557]" />
            <select
              value={trendDays}
              onChange={(e) => handleTrendDaysChange(Number(e.target.value))}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-[#f5f0e8] focus:outline-none focus:border-amber-500/40"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>

        {trends?.trends && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendChart
              data={trends.trends}
              dataKey="avg_offer"
              title="Average Offer Amount Over Time"
              yAxisLabel="Offer ($)"
              color="#f59e0b"
            />
            <TrendChart
              data={trends.trends}
              dataKey="acceptance_rate"
              title="Acceptance Rate Over Time"
              yAxisLabel="Rate (%)"
              color="#10b981"
            />
          </div>
        )}
      </div>

      {/* Category Insights */}
      <div>
        <h2 className="text-lg font-semibold text-[#f5f0e8] mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" /> Category Performance
        </h2>

        {categoryInsights?.insights && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CategoryInsights
              data={categoryInsights.insights.slice(0, 10)}
              dataKey="acceptance_rate"
              title="Acceptance Rate by Category (%)"
            />
            <CategoryInsights
              data={categoryInsights.insights.slice(0, 10)}
              dataKey="total_revenue"
              title="Revenue by Category ($)"
              colors={['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef']}
            />
          </div>
        )}

        {/* Detailed Category Table */}
        {categoryInsights?.insights?.length > 0 && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 mt-4">
            <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4">Detailed Category Metrics</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[#706557] border-b border-white/[0.08]">
                    <th className="text-left py-2 px-3">Category</th>
                    <th className="text-left py-2 px-3">Offers</th>
                    <th className="text-left py-2 px-3">Accept %</th>
                    <th className="text-left py-2 px-3">Avg Offer</th>
                    <th className="text-left py-2 px-3">Volatility</th>
                    <th className="text-left py-2 px-3">Days to Accept</th>
                    <th className="text-left py-2 px-3">AI Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryInsights.insights.map((cat: any) => (
                    <tr key={cat.item_category} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-2 px-3 text-[#f5f0e8] font-medium">{cat.item_category}</td>
                      <td className="py-2 px-3 text-[#c3bbad]">{cat.total_offers}</td>
                      <td className="py-2 px-3">
                        <span className={`${parseFloat(cat.acceptance_rate) >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {cat.acceptance_rate}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-amber-400">${parseFloat(cat.avg_offer || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-[#c3bbad]">${parseFloat(cat.volatility || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-[#c3bbad]">{parseFloat(cat.avg_days_to_accept || 0).toFixed(1)}</td>
                      <td className="py-2 px-3 text-[#c3bbad]">{parseFloat(cat.avg_ai_confidence || 0).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Best Time to Sell */}
      <div>
        <h2 className="text-lg font-semibold text-[#f5f0e8] mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" /> Best Time to Sell
        </h2>
        {bestTime?.byDayOfWeek && (
          <BestTimeHeatmap
            byDayOfWeek={bestTime.byDayOfWeek}
            byHourOfDay={bestTime.byHourOfDay}
          />
        )}
      </div>

      {/* Price Distribution */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#f5f0e8] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" /> Price Distribution
          </h2>
          {categoryInsights?.insights && (
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-[#f5f0e8] focus:outline-none focus:border-amber-500/40"
            >
              {categoryInsights.insights.map((cat: any) => (
                <option key={cat.item_category} value={cat.item_category}>
                  {cat.item_category}
                </option>
              ))}
            </select>
          )}
        </div>

        {priceDistribution && (
          <PriceDistribution
            distribution={priceDistribution.distribution}
            stats={priceDistribution.stats}
            category={priceDistribution.category}
          />
        )}
      </div>

      {/* AI Accuracy */}
      <div>
        <h2 className="text-lg font-semibold text-[#f5f0e8] mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" /> AI Accuracy
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Escalation Rate"
            value={`${ai?.escalationStats?.escalation_rate || 0}%`}
            color="amber"
            sub={`${ai?.escalationStats?.escalated || 0} of ${ai?.escalationStats?.total || 0}`}
          />
          {ai?.confidenceDistribution?.map((d: any) => (
            <StatCard
              key={d.range}
              label={`Confidence ${d.range}`}
              value={d.count}
              color="blue"
              sub={`Avg: ${d.avg_confidence}%`}
            />
          ))}
        </div>

        {ai?.categoryBreakdown?.length > 0 && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4">AI Category Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[#706557] border-b border-white/[0.08]">
                    <th className="text-left py-2 px-3">Category</th>
                    <th className="text-left py-2 px-3">Count</th>
                    <th className="text-left py-2 px-3">Avg Confidence</th>
                    <th className="text-left py-2 px-3">Escalated</th>
                  </tr>
                </thead>
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

      {/* Revenue & Conversions */}
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
      </div>
    </div>
  );
}
