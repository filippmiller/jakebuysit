"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PriceDistributionProps {
  distribution: any[];
  stats: any;
  category: string;
}

export function PriceDistribution({ distribution, stats, category }: PriceDistributionProps) {
  if (!distribution || distribution.length === 0) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6">
        <p className="text-[#706557] text-center">No data available for {category}</p>
      </div>
    );
  }

  const chartData = distribution.map((bucket) => ({
    range: `$${parseFloat(bucket.bucket_min).toFixed(0)}-${parseFloat(bucket.bucket_max).toFixed(0)}`,
    count: parseInt(bucket.count),
  }));

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
          <p className="text-xs text-[#706557]">Mean</p>
          <p className="text-lg font-bold text-amber-400">${parseFloat(stats.mean || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
          <p className="text-xs text-[#706557]">Median</p>
          <p className="text-lg font-bold text-emerald-400">${parseFloat(stats.median || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
          <p className="text-xs text-[#706557]">Range</p>
          <p className="text-lg font-bold text-blue-400">
            ${parseFloat(stats.min || 0).toFixed(0)}-${parseFloat(stats.max || 0).toFixed(0)}
          </p>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
          <p className="text-xs text-[#706557]">Std Dev</p>
          <p className="text-lg font-bold text-purple-400">${parseFloat(stats.std_dev || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Histogram */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4">Price Distribution for {category}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="range"
              stroke="#706557"
              tick={{ fill: '#706557', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#706557"
              tick={{ fill: '#706557', fontSize: 12 }}
              label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: '#706557' } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(20, 18, 16, 0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                color: '#f5f0e8'
              }}
              labelStyle={{ color: '#c3bbad' }}
            />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
