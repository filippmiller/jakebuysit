"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/admin-api";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";

export default function AdminAuditPage() {
  const [data, setData] = useState<any>({ entries: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ limit: 25, offset: 0, search: "", entity_type: "", actor_type: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await adminApi.getAuditLog(params)); } catch (e) { console.error(e); }
    setLoading(false);
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: "created_at", label: "Time", render: (v: string) => new Date(v).toLocaleString() },
    { key: "entity_type", label: "Entity", render: (v: string) => <StatusBadge status={v} variant="processing" /> },
    { key: "entity_id", label: "Entity ID", render: (v: string) => <span className="font-mono text-xs">{v?.slice(0, 8)}</span> },
    { key: "action", label: "Action", render: (v: string) => <span className="text-[#f5f0e8] font-medium">{v}</span> },
    { key: "actor_type", label: "Actor Type" },
    { key: "actor_email", label: "Actor", render: (v: string) => v || "System" },
  ];

  return (
    <DataTable
      columns={columns} data={data.entries} total={data.total}
      limit={params.limit} offset={params.offset}
      onPageChange={(offset) => setParams((p) => ({ ...p, offset }))}
      onSearch={(search) => setParams((p) => ({ ...p, search, offset: 0 }))}
      searchPlaceholder="Search by entity ID or action..."
      loading={loading}
      filters={
        <>
          <select value={params.entity_type} onChange={(e) => setParams((p) => ({ ...p, entity_type: e.target.value, offset: 0 }))}
            className="px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#c3bbad] focus:outline-none">
            <option value="">All Entities</option>
            {["offer","user","payout","shipment","verification","config"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={params.actor_type} onChange={(e) => setParams((p) => ({ ...p, actor_type: e.target.value, offset: 0 }))}
            className="px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#c3bbad] focus:outline-none">
            <option value="">All Actors</option>
            {["user","admin","system"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </>
      }
    />
  );
}
