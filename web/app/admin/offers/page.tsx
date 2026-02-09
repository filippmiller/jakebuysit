"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";

export default function AdminOffersPage() {
  const router = useRouter();
  const [data, setData] = useState<any>({ offers: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ limit: 25, offset: 0, search: "", status: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.getOffers(params);
      setData(result);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v?.slice(0, 8)}</span> },
    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
    { key: "item_brand", label: "Item", render: (_: any, r: any) => `${r.item_brand || "—"} ${r.item_model || ""}`.trim() || "Processing..." },
    { key: "offer_amount", label: "Amount", render: (v: any) => v ? `$${parseFloat(v).toFixed(2)}` : "—" },
    { key: "ai_confidence", label: "AI Conf.", render: (v: any) => v ? `${v}%` : "—" },
    { key: "user_email", label: "User", render: (v: string) => v || "Anonymous" },
    { key: "escalated", label: "Escalated", render: (v: boolean) => v ? <StatusBadge status="escalated" variant="flag" /> : "No" },
    { key: "created_at", label: "Created", render: (v: string) => new Date(v).toLocaleDateString() },
  ];

  return (
    <div>
      <DataTable
        columns={columns} data={data.offers} total={data.total}
        limit={params.limit} offset={params.offset}
        onPageChange={(offset) => setParams((p) => ({ ...p, offset }))}
        onSearch={(search) => setParams((p) => ({ ...p, search, offset: 0 }))}
        searchPlaceholder="Search by brand, model, or ID..."
        onRowClick={(row) => router.push(`/admin/offers/${row.id}`)}
        loading={loading}
        filters={
          <select value={params.status} onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, offset: 0 }))}
            className="px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#c3bbad] focus:outline-none">
            <option value="">All Statuses</option>
            {["processing","ready","accepted","declined","expired","shipped","received","verified","paid","disputed","rejected","cancelled"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        }
      />
    </div>
  );
}
