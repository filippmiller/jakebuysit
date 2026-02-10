"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  title?: string;
  yAxisLabel?: string;
}

export function TrendChart({
  data,
  dataKey,
  xAxisKey = 'date',
  color = '#f59e0b',
  title,
  yAxisLabel
}: TrendChartProps) {
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
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey={xAxisKey}
            stroke="#706557"
            tick={{ fill: '#706557', fontSize: 12 }}
            tickFormatter={(value) => {
              if (xAxisKey === 'date') {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }
              return value;
            }}
          />
          <YAxis
            stroke="#706557"
            tick={{ fill: '#706557', fontSize: 12 }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fill: '#706557' } } : undefined}
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
          <Legend
            wrapperStyle={{ color: '#c3bbad' }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
