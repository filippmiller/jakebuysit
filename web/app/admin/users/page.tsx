"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";

export default function AdminUsersPage() {
  const router = useRouter();
  const [data, setData] = useState<any>({ users: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ limit: 25, offset: 0, search: "", role: "", banned: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await adminApi.getUsers(params)); } catch (e) { console.error(e); }
    setLoading(false);
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: "email", label: "Email" },
    { key: "name", label: "Name", render: (v: string) => v || "—" },
    { key: "role", label: "Role", render: (v: string) => <StatusBadge status={v} /> },
    { key: "trust_score", label: "Trust", render: (v: number) => {
      const color = v >= 70 ? "text-emerald-400" : v >= 40 ? "text-amber-400" : "text-red-400";
      return <span className={`font-medium ${color}`}>{v?.toFixed(0) || "—"}</span>;
    }},
    { key: "offer_count", label: "Offers", render: (v: any) => v || 0 },
    { key: "total_paid", label: "Total Paid", render: (v: any) => v ? `$${parseFloat(v).toFixed(2)}` : "$0" },
    { key: "banned", label: "Status", render: (v: boolean) => v ? <StatusBadge status="Banned" variant="rejected" /> : <StatusBadge status="Active" variant="completed" /> },
    { key: "created_at", label: "Joined", render: (v: string) => new Date(v).toLocaleDateString() },
  ];

  return (
    <DataTable
      columns={columns} data={data.users} total={data.total}
      limit={params.limit} offset={params.offset}
      onPageChange={(offset) => setParams((p) => ({ ...p, offset }))}
      onSearch={(search) => setParams((p) => ({ ...p, search, offset: 0 }))}
      searchPlaceholder="Search by email or name..."
      onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
      loading={loading}
      filters={
        <>
          <select value={params.role} onChange={(e) => setParams((p) => ({ ...p, role: e.target.value, offset: 0 }))}
            className="px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#c3bbad] focus:outline-none">
            <option value="">All Roles</option>
            {["user","admin","super_admin","reviewer","warehouse"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={params.banned} onChange={(e) => setParams((p) => ({ ...p, banned: e.target.value, offset: 0 }))}
            className="px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#c3bbad] focus:outline-none">
            <option value="">All</option>
            <option value="true">Banned</option>
            <option value="false">Active</option>
          </select>
        </>
      }
    />
  );
}
