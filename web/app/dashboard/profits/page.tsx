"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Package,
  Target,
  PieChart,
  Calendar,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type {
  ProfitSummary,
  ProfitTrend,
  CategoryProfit,
  ProfitProjection,
} from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Western color palette
const CHART_COLORS = [
  "#f59e0b", // amber-500
  "#d97706", // amber-600
  "#b45309", // amber-700
  "#92400e", // amber-800
  "#78350f", // amber-900
  "#fbbf24", // amber-400
];

export default function ProfitsPage() {
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [trends, setTrends] = useState<ProfitTrend[]>([]);
  const [categoryProfits, setCategoryProfits] = useState<CategoryProfit[]>([]);
  const [projections, setProjections] = useState<ProfitProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadProfitData();
  }, [interval]);

  const loadProfitData = async () => {
    try {
      setLoading(true);
      const [summaryData, trendsData, categoryData, projectionData] = await Promise.all([
        apiClient.getProfitSummary(),
        apiClient.getProfitTrends(interval, interval === 'week' ? 12 : 6),
        apiClient.getProfitByCategory(),
        apiClient.getProfitProjections(),
      ]);

      setSummary(summaryData);
      setTrends(trendsData);
      setCategoryProfits(categoryData);
      setProjections(projectionData);
    } catch (err) {
      console.error("Failed to load profit data:", err);
      // Load mock data for development
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setSummary({
      totalProfit: 2850.50,
      totalSales: 12,
      avgProfitPerSale: 237.54,
      avgProfitMargin: 45.2,
      currentMonthProfit: 890.25,
      currentMonthSales: 4,
    });

    setTrends([
      { period: "2026-01-06", profit: 320, sales: 2, avgProfit: 160 },
      { period: "2026-01-13", profit: 450, sales: 3, avgProfit: 150 },
      { period: "2026-01-20", profit: 280, sales: 1, avgProfit: 280 },
      { period: "2026-01-27", profit: 510, sales: 2, avgProfit: 255 },
      { period: "2026-02-03", profit: 400, sales: 2, avgProfit: 200 },
      { period: "2026-02-10", profit: 490, sales: 2, avgProfit: 245 },
    ]);

    setCategoryProfits([
      { category: "Electronics", profit: 1500, sales: 6, avgProfit: 250, profitMargin: 48.5 },
      { category: "Gaming", profit: 850, sales: 3, avgProfit: 283, profitMargin: 52.1 },
      { category: "Phones & Tablets", profit: 500, sales: 3, avgProfit: 167, profitMargin: 38.2 },
    ]);

    setProjections({
      pendingOffers: 3,
      estimatedRevenue: 1850,
      estimatedCosts: 980,
      estimatedProfit: 870,
      ifAllAcceptedProfit: 870,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0d0a]">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[#a89d8a]">Loading profit data...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0d0a] relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-amber-900/[0.06] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-amber-800/[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/[0.15] to-amber-400/[0.05] border-b border-white/[0.08] py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-4xl font-bold text-[#f5f0e8] mb-2 flex items-center gap-3">
                <DollarSign className="w-10 h-10 text-amber-400" />
                Profit Dashboard
              </h1>
              <p className="text-[#a89d8a] text-lg">
                Track your earnings and see what's makin' you money
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Summary Cards */}
          {summary && (
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                icon={<DollarSign className="w-6 h-6" />}
                label="Total Profit"
                value={formatCurrency(summary.totalProfit)}
                subtext="All time"
                color="green"
              />
              <SummaryCard
                icon={<Package className="w-6 h-6" />}
                label="Items Sold"
                value={summary.totalSales}
                subtext={`${formatCurrency(summary.avgProfitPerSale)} avg`}
                color="blue"
              />
              <SummaryCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Current Month"
                value={formatCurrency(summary.currentMonthProfit)}
                subtext={`${summary.currentMonthSales} sales`}
                color="amber"
              />
              <SummaryCard
                icon={<Target className="w-6 h-6" />}
                label="Profit Margin"
                value={`${summary.avgProfitMargin.toFixed(1)}%`}
                subtext="Average"
                color="purple"
              />
            </div>
          )}

          {/* Profit Trends Chart */}
          {trends.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-6 mb-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#f5f0e8] flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-amber-400" />
                  Profit Trends
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInterval('week')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      interval === 'week'
                        ? 'bg-amber-500/[0.2] text-amber-400 border border-amber-500/30'
                        : 'bg-white/[0.05] text-[#a89d8a] border border-white/[0.1] hover:bg-white/[0.08]'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setInterval('month')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      interval === 'month'
                        ? 'bg-amber-500/[0.2] text-amber-400 border border-amber-500/30'
                        : 'bg-white/[0.05] text-[#a89d8a] border border-white/[0.1] hover:bg-white/[0.08]'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="period"
                    stroke="#a89d8a"
                    tick={{ fill: '#a89d8a' }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return interval === 'week'
                        ? `${date.getMonth() + 1}/${date.getDate()}`
                        : date.toLocaleDateString('en-US', { month: 'short' });
                    }}
                  />
                  <YAxis stroke="#a89d8a" tick={{ fill: '#a89d8a' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1510',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#f5f0e8',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ color: '#a89d8a' }} />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    name="Profit"
                    dot={{ fill: '#f59e0b', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Category Breakdown */}
          {categoryProfits.length > 0 && (
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Pie Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-6"
              >
                <h2 className="text-2xl font-bold text-[#f5f0e8] mb-6 flex items-center gap-2">
                  <PieChart className="w-6 h-6 text-amber-400" />
                  Profit by Category
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={categoryProfits}
                      dataKey="profit"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.category}: ${formatCurrency(entry.profit)}`}
                      labelLine={{ stroke: '#a89d8a' }}
                    >
                      {categoryProfits.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1510',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#f5f0e8',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </motion.div>

              {/* Category Table */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-6"
              >
                <h2 className="text-2xl font-bold text-[#f5f0e8] mb-6">Category Details</h2>
                <div className="space-y-4">
                  {categoryProfits.map((cat, idx) => (
                    <div
                      key={idx}
                      className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-[#f5f0e8]">{cat.category}</h3>
                          <p className="text-sm text-[#a89d8a]">{cat.sales} sales</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-400">
                            {formatCurrency(cat.profit)}
                          </p>
                          <p className="text-sm text-[#a89d8a]">
                            {cat.profitMargin.toFixed(1)}% margin
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#706557]">Avg per sale:</span>
                        <span className="font-medium text-[#c3bbad]">
                          {formatCurrency(cat.avgProfit)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {/* Projections Widget */}
          {projections && projections.pendingOffers > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-green-500/[0.1] to-green-400/[0.05] border border-green-500/20 rounded-2xl p-6"
            >
              <h2 className="text-2xl font-bold text-[#f5f0e8] mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-green-400" />
                Profit Projections
              </h2>
              <p className="text-[#a89d8a] mb-6">
                You have {projections.pendingOffers} active offer{projections.pendingOffers !== 1 ? 's' : ''}
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-4">
                  <p className="text-sm text-[#706557] mb-1">Estimated Revenue</p>
                  <p className="text-2xl font-bold text-[#f5f0e8]">
                    {formatCurrency(projections.estimatedRevenue)}
                  </p>
                </div>
                <div className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-4">
                  <p className="text-sm text-[#706557] mb-1">Estimated Costs</p>
                  <p className="text-2xl font-bold text-[#f5f0e8]">
                    {formatCurrency(projections.estimatedCosts)}
                  </p>
                </div>
                <div className="bg-white/[0.05] border border-green-500/20 rounded-xl p-4">
                  <p className="text-sm text-green-400 mb-1">If All Accepted</p>
                  <p className="text-2xl font-bold text-green-400 flex items-center gap-2">
                    {formatCurrency(projections.ifAllAcceptedProfit)}
                    <ArrowUp className="w-5 h-5" />
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}

// Summary Card Component
function SummaryCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  color: "green" | "blue" | "amber" | "purple";
}) {
  const colors = {
    green: "bg-green-500/[0.1] text-green-400 border-green-500/20",
    blue: "bg-blue-500/[0.1] text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/[0.1] text-amber-400 border-amber-500/20",
    purple: "bg-purple-500/[0.1] text-purple-400 border-purple-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${colors[color]} border rounded-xl p-4`}
    >
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold text-[#f5f0e8] mb-1">{value}</p>
      <p className="text-sm text-[#a89d8a]">{subtext}</p>
    </motion.div>
  );
}
