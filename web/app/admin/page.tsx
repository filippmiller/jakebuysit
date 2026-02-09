"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import {
  Package, DollarSign, Truck, Users, AlertTriangle, TrendingUp,
  Activity, Clock,
} from "lucide-react";

function MetricCard({ label, value, icon: Icon, color = "amber" }: { label: string; value: string | number; icon: any; color?: string }) {
  const colors: Record<string, string> = {
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#f5f0e8]">{value}</p>
      <p className="text-sm text-[#706557] mt-1">{label}</p>
    </div>
  );
}

function AlertItem({ type, message, time }: { type: string; message: string; time: string }) {
  const colors: Record<string, string> = {
    fraud: "border-l-red-500 bg-red-500/5",
    payout: "border-l-amber-500 bg-amber-500/5",
    shipping: "border-l-blue-500 bg-blue-500/5",
    escalation: "border-l-purple-500 bg-purple-500/5",
  };

  return (
    <div className={`border-l-4 rounded-r-lg p-3 ${colors[type] || "border-l-gray-500 bg-white/[0.03]"}`}>
      <p className="text-sm text-[#f5f0e8]">{message}</p>
      <p className="text-xs text-[#706557] mt-1">{time}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getDashboardMetrics(),
      adminApi.getDashboardAlerts(),
      adminApi.getDashboardActivity(),
    ]).then(([m, a, act]) => {
      setMetrics(m);
      setAlerts(a);
      setActivity(act.activity || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const o = metrics?.offers || {};
  const p = metrics?.payouts || {};
  const s = metrics?.shipments || {};
  const u = metrics?.users || {};

  return (
    <div className="space-y-8">
      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Today's Offers" value={o.today_total || 0} icon={Package} color="amber" />
        <MetricCard label="Acceptance Rate" value={`${o.acceptance_rate || 0}%`} icon={TrendingUp} color="green" />
        <MetricCard label="Pending Payouts" value={p.pending || 0} icon={DollarSign} color="blue" />
        <MetricCard label="In Transit" value={s.in_transit || 0} icon={Truck} color="purple" />
        <MetricCard label="Open Escalations" value={metrics?.pendingEscalations || 0} icon={AlertTriangle} color="red" />
        <MetricCard label="Today's Revenue" value={`$${o.today_accepted_value || 0}`} icon={DollarSign} color="green" />
        <MetricCard label="Total Users" value={u.total || 0} icon={Users} color="blue" />
        <MetricCard label="Failed Payouts" value={p.failed || 0} icon={AlertTriangle} color="red" />
      </div>

      {/* Alerts & Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[#f5f0e8] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Active Alerts
          </h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {alerts?.pendingEscalations?.map((e: any) => (
              <AlertItem key={e.id} type="escalation"
                message={`Escalation: ${e.item_brand} ${e.item_model} — $${e.offer_amount}`}
                time={new Date(e.created_at).toLocaleString()} />
            ))}
            {alerts?.fraudAlerts?.map((f: any) => (
              <AlertItem key={f.id} type="fraud"
                message={`Fraud ${f.result}: ${f.check_type} on ${f.item_brand} ${f.item_model}`}
                time={new Date(f.created_at).toLocaleString()} />
            ))}
            {alerts?.failedPayouts?.map((p: any) => (
              <AlertItem key={p.id} type="payout"
                message={`Failed payout $${p.amount} (${p.method}) — ${p.failure_reason}`}
                time={new Date(p.created_at).toLocaleString()} />
            ))}
            {alerts?.shippingExceptions?.map((s: any) => (
              <AlertItem key={s.id} type="shipping"
                message={`Shipping exception: ${s.tracking_number} (${s.carrier})`}
                time={new Date(s.updated_at).toLocaleString()} />
            ))}
            {(!alerts || Object.values(alerts).every((a: any) => !a?.length)) && (
              <p className="text-[#706557] text-sm text-center py-8">No active alerts</p>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[#f5f0e8] mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Recent Activity
          </h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activity.slice(0, 20).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                <Clock className="w-3.5 h-3.5 text-[#706557] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#c3bbad] truncate">
                    <span className="text-[#f5f0e8] font-medium">{a.action}</span> on {a.entity_type}
                  </p>
                </div>
                <span className="text-xs text-[#706557] shrink-0">
                  {new Date(a.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-[#706557] text-sm text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
