"use client";

interface BestTimeHeatmapProps {
  byDayOfWeek: any[];
  byHourOfDay: any[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColor(rate: number): string {
  if (rate >= 70) return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400';
  if (rate >= 60) return 'bg-green-500/20 border-green-500/40 text-green-400';
  if (rate >= 50) return 'bg-amber-500/20 border-amber-500/40 text-amber-400';
  if (rate >= 40) return 'bg-orange-500/20 border-orange-500/40 text-orange-400';
  return 'bg-red-500/20 border-red-500/40 text-red-400';
}

export function BestTimeHeatmap({ byDayOfWeek, byHourOfDay }: BestTimeHeatmapProps) {
  if (!byDayOfWeek || byDayOfWeek.length === 0) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6">
        <p className="text-[#706557] text-center">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Day of Week Heatmap */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4">Best Days of Week</h3>
        <div className="grid grid-cols-7 gap-2">
          {byDayOfWeek.map((day) => {
            const rate = parseFloat(day.acceptance_rate || '0');
            const colorClass = getColor(rate);
            return (
              <div
                key={day.day_of_week}
                className={`border rounded-lg p-3 text-center ${colorClass}`}
              >
                <div className="text-xs font-medium mb-1">
                  {DAY_NAMES[day.day_of_week]}
                </div>
                <div className="text-lg font-bold">{rate.toFixed(0)}%</div>
                <div className="text-xs opacity-70 mt-1">{day.total} offers</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-[#706557]">
          <span>Low</span>
          <div className="flex gap-1 flex-1">
            <div className="h-4 flex-1 bg-red-500/20 rounded"></div>
            <div className="h-4 flex-1 bg-orange-500/20 rounded"></div>
            <div className="h-4 flex-1 bg-amber-500/20 rounded"></div>
            <div className="h-4 flex-1 bg-green-500/20 rounded"></div>
            <div className="h-4 flex-1 bg-emerald-500/20 rounded"></div>
          </div>
          <span>High</span>
        </div>
      </div>

      {/* Hour of Day Analysis */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4">Best Hours of Day</h3>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
          {byHourOfDay.map((hour) => {
            const rate = parseFloat(hour.acceptance_rate || '0');
            const colorClass = getColor(rate);
            const hourNum = parseInt(hour.hour);
            const timeLabel = hourNum === 0 ? '12am' : hourNum === 12 ? '12pm' : hourNum > 12 ? `${hourNum - 12}pm` : `${hourNum}am`;

            return (
              <div
                key={hour.hour}
                className={`border rounded-lg p-2 text-center text-xs ${colorClass}`}
              >
                <div className="font-medium">{timeLabel}</div>
                <div className="font-bold">{rate.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
