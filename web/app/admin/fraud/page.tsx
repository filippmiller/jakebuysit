"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/admin-api";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";

export default function AdminFraudPage() {
  const [data, setData] = useState<any>({ fraudChecks: [], total: 0 });
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ limit: 25, offset: 0, search: "", result: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [checks, st] = await Promise.all([adminApi.getFraudChecks(params), adminApi.getFraudStats()]);
      setData(checks);
      setStats(st.stats || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v?.slice(0, 8)}</span> },
    { key: "check_type", label: "Type" },
    { key: "result", label: "Result", render: (v: string) => <StatusBadge status={v} /> },
    { key: "confidence", label: "Confidence", render: (v: any) => v ? `${(v * 100).toFixed(1)}%` : "—" },
    { key: "item_brand", label: "Item", render: (_: any, r: any) => `${r.item_brand || ""} ${r.item_model || ""}`.trim() || "—" },
    { key: "offer_amount", label: "Amount", render: (v: any) => v ? `$${parseFloat(v).toFixed(2)}` : "—" },
    { key: "user_email", label: "User" },
    { key: "created_at", label: "Date", render: (v: string) => new Date(v).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s: any, i: number) => (
            <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
              <p className="text-xs text-[#706557]">{s.check_type}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={s.result} />
                <span className="text-lg font-bold text-[#f5f0e8]">{s.count}</span>
              </div>
              <p className="text-xs text-[#706557] mt-1">Avg conf: {s.avg_confidence ? `${(parseFloat(s.avg_confidence) * 100).toFixed(0)}%` : "—"}</p>
            </div>
          ))}
        </div>
      )}

      <DataTable
        columns={columns} data={data.fraudChecks} total={data.total}
        limit={params.limit} offset={params.offset}
        onPageChange={(offset) => setParams((p) => ({ ...p, offset }))}
        onSearch={(search) => setParams((p) => ({ ...p, search, offset: 0 }))}
        searchPlaceholder="Search by email or item..."
        loading={loading}
        filters={
          <select value={params.result} onChange={(e) => setParams((p) => ({ ...p, result: e.target.value, offset: 0 }))}
            className="px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#c3bbad] focus:outline-none">
            <option value="">All Results</option>
            {["pass","flag","fail"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        }
      />
    </div>
  );
}
