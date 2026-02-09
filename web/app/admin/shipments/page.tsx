"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/admin-api";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";

export default function AdminShipmentsPage() {
  const [data, setData] = useState<any>({ shipments: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ limit: 25, offset: 0, search: "", status: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await adminApi.getShipments(params)); } catch (e) { console.error(e); }
    setLoading(false);
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: "tracking_number", label: "Tracking", render: (v: string) => <span className="font-mono text-xs">{v || "—"}</span> },
    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
    { key: "carrier", label: "Carrier" },
    { key: "item_brand", label: "Item", render: (_: any, r: any) => `${r.item_brand || ""} ${r.item_model || ""}`.trim() || "—" },
    { key: "offer_amount", label: "Value", render: (v: any) => v ? `$${parseFloat(v).toFixed(2)}` : "—" },
    { key: "user_email", label: "User" },
    { key: "estimated_delivery", label: "Est. Delivery", render: (v: string) => v ? new Date(v).toLocaleDateString() : "—" },
    { key: "created_at", label: "Created", render: (v: string) => new Date(v).toLocaleDateString() },
  ];

  return (
    <DataTable
      columns={columns} data={data.shipments} total={data.total}
      limit={params.limit} offset={params.offset}
      onPageChange={(offset) => setParams((p) => ({ ...p, offset }))}
      onSearch={(search) => setParams((p) => ({ ...p, search, offset: 0 }))}
      searchPlaceholder="Search by tracking number or email..."
      loading={loading}
      filters={
        <select value={params.status} onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, offset: 0 }))}
          className="px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#c3bbad] focus:outline-none">
          <option value="">All Statuses</option>
          {["label_created","in_transit","delivered","exception"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      }
    />
  );
}
