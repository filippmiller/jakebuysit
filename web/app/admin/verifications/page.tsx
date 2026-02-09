"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { StatusBadge } from "@/components/admin/DataTable";
import { ClipboardCheck, CheckCircle, XCircle } from "lucide-react";

export default function AdminVerificationsPage() {
  const [data, setData] = useState<any>({ pending: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setData(await adminApi.getVerifications()); } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const verify = async (offerId: string, approved: boolean) => {
    const notes = prompt(`${approved ? "Approval" : "Rejection"} notes:`);
    if (!notes && !approved) return;
    const revised = !approved ? parseFloat(prompt("Revised offer (or 0 to reject):") || "0") : undefined;

    setSubmitting(offerId);
    try {
      await adminApi.submitVerification({
        offer_id: offerId,
        approved,
        notes,
        revised_offer: revised || undefined,
        condition_match: approved,
      });
      load();
    } catch (e) { console.error(e); }
    setSubmitting(null);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8">
      {/* Pending */}
      <div>
        <h2 className="text-lg font-semibold text-[#f5f0e8] mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-amber-400" /> Pending Verification ({data.pending?.length || 0})
        </h2>

        {data.pending?.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-8 text-center">
            <p className="text-[#706557]">No items awaiting verification</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {data.pending.map((item: any) => (
              <div key={item.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[#f5f0e8] font-medium">{item.item_brand} {item.item_model}</p>
                  <p className="text-sm text-[#706557]">Condition: {item.item_condition} | Offer: ${item.offer_amount ? parseFloat(item.offer_amount).toFixed(2) : "—"}</p>
                  <p className="text-xs text-[#706557] mt-1">Tracking: {item.tracking_number || "—"} | Delivered: {item.actual_delivery ? new Date(item.actual_delivery).toLocaleDateString() : "—"}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => verify(item.id, true)} disabled={submitting === item.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm hover:bg-emerald-500/20 transition-colors">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => verify(item.id, false)} disabled={submitting === item.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-colors">
                    <XCircle className="w-4 h-4" /> Dispute
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      {data.completed?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#f5f0e8] mb-4">Recently Verified</h2>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-[#706557] border-b border-white/[0.08]">
                <th className="text-left py-2 px-4">Item</th>
                <th className="text-left py-2 px-4">Offer</th>
                <th className="text-left py-2 px-4">Result</th>
                <th className="text-left py-2 px-4">Condition Match</th>
                <th className="text-left py-2 px-4">Verified At</th>
              </tr></thead>
              <tbody>
                {data.completed.map((v: any) => (
                  <tr key={v.id} className="border-b border-white/[0.04]">
                    <td className="py-2 px-4 text-[#c3bbad]">{v.item_brand} {v.item_model}</td>
                    <td className="py-2 px-4 text-[#c3bbad]">${v.offer_amount ? parseFloat(v.offer_amount).toFixed(2) : "—"}</td>
                    <td className="py-2 px-4">{v.approved ? <StatusBadge status="Approved" variant="completed" /> : <StatusBadge status="Disputed" variant="rejected" />}</td>
                    <td className="py-2 px-4 text-[#c3bbad]">{v.condition_match ? "Yes" : "No"}</td>
                    <td className="py-2 px-4 text-[#706557]">{new Date(v.verified_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
