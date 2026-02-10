"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface CategoryInsightsProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  title?: string;
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function CategoryInsights({
  data,
  dataKey,
  xAxisKey = 'item_category',
  title,
  colors = DEFAULT_COLORS
}: CategoryInsightsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6">
        <p className="text-[#706557] text-center">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6">
      {title && <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            type="number"
            stroke="#706557"
            tick={{ fill: '#706557', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey={xAxisKey}
            stroke="#706557"
            tick={{ fill: '#706557', fontSize: 12 }}
            width={100}
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
          <Legend wrapperStyle={{ color: '#c3bbad' }} />
          <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
