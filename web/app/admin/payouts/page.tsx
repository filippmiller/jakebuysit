"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/admin-api";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { Check, X } from "lucide-react";

export default function AdminPayoutsPage() {
  const [data, setData] = useState<any>({ payouts: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ limit: 25, offset: 0, search: "", status: "" });
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await adminApi.getPayouts(params)); } catch (e) { console.error(e); }
    setLoading(false);
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const handleProcess = async (id: string, action: "approve" | "reject") => {
    setProcessing(id);
    try {
      await adminApi.processPayout(id, { action });
      load();
    } catch (e) { console.error(e); }
    setProcessing(null);
  };

  const handleComplete = async (id: string) => {
    setProcessing(id);
    try {
      await adminApi.completePayout(id);
      load();
    } catch (e) { console.error(e); }
    setProcessing(null);
  };

  const columns = [
    { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v?.slice(0, 8)}</span> },
    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
    { key: "amount", label: "Amount", render: (v: any) => `$${parseFloat(v).toFixed(2)}` },
    { key: "method", label: "Method", render: (v: string) => <span className="capitalize">{v}</span> },
    { key: "user_email", label: "User" },
    { key: "item_brand", label: "Item", render: (_: any, r: any) => `${r.item_brand || ""} ${r.item_model || ""}`.trim() || "—" },
    { key: "created_at", label: "Created", render: (v: string) => new Date(v).toLocaleDateString() },
    { key: "actions", label: "Actions", render: (_: any, r: any) => {
      if (r.status === "pending") return (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); handleProcess(r.id, "approve"); }}
            disabled={processing === r.id}
            className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleProcess(r.id, "reject"); }}
            disabled={processing === r.id}
            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
      if (r.status === "processing") return (
        <button onClick={(e) => { e.stopPropagation(); handleComplete(r.id); }}
          disabled={processing === r.id}
          className="px-2 py-1 text-xs rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
          Complete
        </button>
      );
      return null;
    }},
  ];

  return (
    <DataTable
      columns={columns} data={data.payouts} total={data.total}
      limit={params.limit} offset={params.offset}
      onPageChange={(offset) => setParams((p) => ({ ...p, offset }))}
      onSearch={(search) => setParams((p) => ({ ...p, search, offset: 0 }))}
      searchPlaceholder="Search by email or transaction ref..."
      loading={loading}
      filters={
        <select value={params.status} onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, offset: 0 }))}
          className="px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#c3bbad] focus:outline-none">
          <option value="">All Statuses</option>
          {["pending","processing","completed","failed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      }
    />
  );
}
