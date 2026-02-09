"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { Hand, CheckCircle } from "lucide-react";

export default function AdminEscalationsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>({ escalations: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ limit: 25, offset: 0, search: "", status: "open" });
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await adminApi.getEscalations(params)); } catch (e) { console.error(e); }
    setLoading(false);
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const claim = async (id: string) => {
    setProcessing(id);
    try { await adminApi.claimEscalation(id); load(); } catch (e) { console.error(e); }
    setProcessing(null);
  };

  const resolve = async (id: string, decision: string) => {
    const notes = prompt("Resolution notes:");
    if (!notes) return;
    const revised = decision === "adjust" ? parseFloat(prompt("Revised amount:") || "0") : undefined;
    setProcessing(id);
    try { await adminApi.resolveEscalation(id, { decision, notes, revised_amount: revised }); load(); } catch (e) { console.error(e); }
    setProcessing(null);
  };

  const columns = [
    { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v?.slice(0, 8)}</span> },
    { key: "item_brand", label: "Item", render: (_: any, r: any) => `${r.item_brand || "—"} ${r.item_model || ""}` },
    { key: "offer_amount", label: "Amount", render: (v: any) => v ? `$${parseFloat(v).toFixed(2)}` : "—" },
    { key: "escalation_reason", label: "Reason" },
    { key: "reviewer_email", label: "Reviewer", render: (v: string) => v || "Unclaimed" },
    { key: "created_at", label: "Created", render: (v: string) => new Date(v).toLocaleDateString() },
    { key: "actions", label: "Actions", render: (_: any, r: any) => {
      if (!r.reviewer_id) return (
        <button onClick={(e) => { e.stopPropagation(); claim(r.id); }} disabled={processing === r.id}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20">
          <Hand className="w-3 h-3" /> Claim
        </button>
      );
      if (!r.reviewed_at) return (
        <div className="flex gap-1">
          {["approve", "adjust", "reject"].map((d) => (
            <button key={d} onClick={(e) => { e.stopPropagation(); resolve(r.id, d); }} disabled={processing === r.id}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                d === "approve" ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" :
                d === "reject" ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" :
                "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              }`}>{d}</button>
          ))}
        </div>
      );
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    }},
  ];

  return (
    <DataTable
      columns={columns} data={data.escalations} total={data.total}
      limit={params.limit} offset={params.offset}
      onPageChange={(offset) => setParams((p) => ({ ...p, offset }))}
      onSearch={(search) => setParams((p) => ({ ...p, search, offset: 0 }))}
      searchPlaceholder="Search by brand or model..."
      onRowClick={(row) => router.push(`/admin/offers/${row.id}`)}
      loading={loading}
      filters={
        <select value={params.status} onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, offset: 0 }))}
          className="px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#c3bbad] focus:outline-none">
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="claimed">Claimed</option>
          <option value="resolved">Resolved</option>
        </select>
      }
    />
  );
}
