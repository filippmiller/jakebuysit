"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
  onSearch?: (search: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  onRowClick?: (row: any) => void;
  loading?: boolean;
}

export function DataTable({
  columns, data, total, limit, offset,
  onPageChange, onSearch, searchPlaceholder,
  filters, onRowClick, loading,
}: DataTableProps) {
  const [search, setSearch] = useState("");
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleSearch = () => onSearch?.(search);

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {onSearch && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#706557]" />
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={searchPlaceholder || "Search..."}
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#f5f0e8] placeholder-[#706557] focus:border-amber-500/40 focus:outline-none transition-colors"
            />
          </div>
        )}
        {filters}
      </div>

      {/* Table */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-[#706557] uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center">
                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-[#706557] text-sm">
                    No results found
                  </td>
                </tr>
              ) : data.map((row, i) => (
                <tr key={row.id || i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-white/[0.04] last:border-0 transition-colors
                    ${onRowClick ? "cursor-pointer hover:bg-white/[0.04]" : ""}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-[#c3bbad]">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.08]">
          <span className="text-xs text-[#706557]">
            {total > 0 ? `${offset + 1}-${Math.min(offset + limit, total)} of ${total}` : "0 results"}
          </span>
          <div className="flex gap-1">
            <button disabled={currentPage <= 1} onClick={() => onPageChange(offset - limit)}
              className="p-1.5 rounded text-[#706557] hover:text-[#f5f0e8] hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs text-[#a89d8a]">{currentPage} / {totalPages || 1}</span>
            <button disabled={currentPage >= totalPages} onClick={() => onPageChange(offset + limit)}
              className="p-1.5 rounded text-[#706557] hover:text-[#f5f0e8] hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status, variant }: { status: string; variant?: string }) {
  const v = variant || status;
  const colors: Record<string, string> = {
    processing: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    ready: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    accepted: "bg-green-500/15 text-green-400 border-green-500/25",
    declined: "bg-gray-500/15 text-gray-400 border-gray-500/25",
    expired: "bg-gray-500/15 text-gray-400 border-gray-500/25",
    shipped: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
    received: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    verified: "bg-teal-500/15 text-teal-400 border-teal-500/25",
    paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    disputed: "bg-red-500/15 text-red-400 border-red-500/25",
    rejected: "bg-red-500/15 text-red-400 border-red-500/25",
    cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/25",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    failed: "bg-red-500/15 text-red-400 border-red-500/25",
    pass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    flag: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    fail: "bg-red-500/15 text-red-400 border-red-500/25",
    label_created: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    in_transit: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
    delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    exception: "bg-red-500/15 text-red-400 border-red-500/25",
    admin: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    super_admin: "bg-red-500/15 text-red-400 border-red-500/25",
    reviewer: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    warehouse: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    user: "bg-gray-500/15 text-gray-400 border-gray-500/25",
  };

  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${colors[v] || "bg-gray-500/15 text-gray-400 border-gray-500/25"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
