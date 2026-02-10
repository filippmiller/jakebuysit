"use client";

import { ExternalLink, ShoppingBag, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ConditionBadge } from "./ConditionBadge";

interface ComparableSale {
  source: string;
  title: string;
  price: number;
  soldDate?: string;
  condition: string;
  url?: string;
}

interface ComparableSalesTableProps {
  sales: ComparableSale[];
  className?: string;
}

const sourceConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  ebay: {
    label: "eBay",
    bgColor: "bg-blue-500/20",
    textColor: "text-blue-300",
  },
  facebook: {
    label: "Facebook",
    bgColor: "bg-indigo-500/20",
    textColor: "text-indigo-300",
  },
  amazon: {
    label: "Amazon",
    bgColor: "bg-amber-500/20",
    textColor: "text-amber-300",
  },
  manual: {
    label: "Manual",
    bgColor: "bg-gray-500/20",
    textColor: "text-gray-300",
  },
};

function formatRelativeDate(dateString?: string): string {
  if (!dateString) return "Recently";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString();
}

export function ComparableSalesTable({
  sales,
  className = "",
}: ComparableSalesTableProps) {
  if (!sales || sales.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-semibold text-[#f5f0e8]">
          Recent Comparable Sales
        </h3>
      </div>

      <div className="space-y-3">
        {sales.map((sale, index) => {
          const sourceKey = sale.source.toLowerCase();
          const sourceStyle = sourceConfig[sourceKey] || sourceConfig.manual;

          return (
            <div
              key={index}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`px-2 py-0.5 ${sourceStyle.bgColor} ${sourceStyle.textColor} text-xs font-medium rounded`}
                    >
                      {sourceStyle.label}
                    </span>
                    <ConditionBadge
                      condition={sale.condition}
                      size="sm"
                      showIcon={false}
                    />
                  </div>
                  <h4 className="text-sm text-[#f5f0e8] font-medium truncate">
                    {sale.title}
                  </h4>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-emerald-300">
                    {formatCurrency(sale.price)}
                  </div>
                  <div className="text-xs text-[#706557]">
                    {formatRelativeDate(sale.soldDate)}
                  </div>
                </div>
              </div>

              {sale.url && (
                <a
                  href={sale.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  View listing
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
        <ShoppingBag className="w-4 h-4 text-[#a89d8a]" />
        <p className="text-xs text-[#a89d8a]">
          Prices shown are recent verified sales from trusted marketplaces
        </p>
      </div>
    </div>
  );
}
