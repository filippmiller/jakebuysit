"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { StatusBadge } from "@/components/admin/DataTable";
import { ArrowLeft, Brain, ShoppingCart, Calculator, AlertTriangle, Package, DollarSign, Truck, ClipboardCheck } from "lucide-react";

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-amber-400" /> {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="mb-2">
      <span className="text-xs text-[#706557]">{label}: </span>
      <span className="text-sm text-[#c3bbad]">{value ?? "—"}</span>
    </div>
  );
}

export default function AdminOfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [aiLog, setAiLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getOffer(id),
      adminApi.getOfferAiLog(id),
    ]).then(([d, ai]) => { setData(d); setAiLog(ai); })
      .catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data?.offer) return <p className="text-[#706557] text-center py-12">Offer not found</p>;

  const o = data.offer;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[#706557] hover:text-[#f5f0e8] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Offers
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-xl font-bold text-[#f5f0e8]">{o.item_brand} {o.item_model || ""}</h2>
        <StatusBadge status={o.status} />
        {o.escalated && <StatusBadge status="Escalated" variant="flag" />}
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">${o.offer_amount ? parseFloat(o.offer_amount).toFixed(2) : "—"}</p>
          <p className="text-xs text-[#706557] mt-1">Offer Amount</p>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#f5f0e8]">${o.fmv ? parseFloat(o.fmv).toFixed(2) : "—"}</p>
          <p className="text-xs text-[#706557] mt-1">Fair Market Value</p>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#f5f0e8]">{o.ai_confidence ? `${o.ai_confidence}%` : "—"}</p>
          <p className="text-xs text-[#706557] mt-1">AI Confidence</p>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#f5f0e8]">{o.item_condition || "—"}</p>
          <p className="text-xs text-[#706557] mt-1">Condition</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* AI Vision */}
        <Section title="AI Vision Analysis" icon={Brain}>
          <Field label="Category" value={aiLog?.vision?.itemCategory} />
          <Field label="Brand" value={aiLog?.vision?.itemBrand} />
          <Field label="Model" value={aiLog?.vision?.itemModel} />
          <Field label="Condition" value={aiLog?.vision?.itemCondition} />
          <Field label="Confidence" value={aiLog?.vision?.confidence ? `${aiLog.vision.confidence}%` : null} />
          <Field label="Model Used" value={aiLog?.vision?.modelUsed} />
          {aiLog?.vision?.features && (
            <div className="mt-2">
              <span className="text-xs text-[#706557]">Features: </span>
              <pre className="text-xs text-[#a89d8a] mt-1 bg-white/[0.03] p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(aiLog.vision.features, null, 2)}
              </pre>
            </div>
          )}
        </Section>

        {/* Marketplace */}
        <Section title="Marketplace Data" icon={ShoppingCart}>
          <Field label="FMV" value={aiLog?.marketplace?.fmv ? `$${aiLog.marketplace.fmv}` : null} />
          <Field label="FMV Confidence" value={aiLog?.marketplace?.fmvConfidence ? `${aiLog.marketplace.fmvConfidence}%` : null} />
          {aiLog?.marketplace?.data && (
            <pre className="text-xs text-[#a89d8a] mt-2 bg-white/[0.03] p-2 rounded overflow-auto max-h-48">
              {JSON.stringify(aiLog.marketplace.data, null, 2)}
            </pre>
          )}
        </Section>

        {/* Pricing */}
        <Section title="Pricing Breakdown" icon={Calculator}>
          <Field label="Condition Multiplier" value={aiLog?.pricing?.conditionMultiplier} />
          <Field label="Category Margin" value={aiLog?.pricing?.categoryMargin} />
          <Field label="Final Offer" value={aiLog?.pricing?.finalOffer ? `$${aiLog.pricing.finalOffer}` : null} />
          <Field label="Offer-to-Market Ratio" value={aiLog?.pricing?.offerToMarketRatio ? `${(aiLog.pricing.offerToMarketRatio * 100).toFixed(1)}%` : null} />
          {aiLog?.pricing?.dynamicAdjustments && (
            <pre className="text-xs text-[#a89d8a] mt-2 bg-white/[0.03] p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(aiLog.pricing.dynamicAdjustments, null, 2)}
            </pre>
          )}
        </Section>

        {/* Escalation */}
        {o.escalated && (
          <Section title="Escalation" icon={AlertTriangle}>
            <Field label="Reason" value={o.escalation_reason} />
            <Field label="Reviewer" value={data.offer.reviewer_email || o.reviewer_id || "Unclaimed"} />
            <Field label="Reviewed At" value={o.reviewed_at ? new Date(o.reviewed_at).toLocaleString() : "Pending"} />
            {o.escalation_notes && (
              <pre className="text-xs text-[#a89d8a] mt-2 bg-white/[0.03] p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(typeof o.escalation_notes === "string" ? JSON.parse(o.escalation_notes) : o.escalation_notes, null, 2)}
              </pre>
            )}
          </Section>
        )}

        {/* Shipment */}
        {data.shipment && (
          <Section title="Shipment" icon={Truck}>
            <Field label="Tracking" value={data.shipment.tracking_number} />
            <Field label="Carrier" value={data.shipment.carrier} />
            <Field label="Status" value={data.shipment.status} />
            <Field label="Est. Delivery" value={data.shipment.estimated_delivery ? new Date(data.shipment.estimated_delivery).toLocaleDateString() : null} />
          </Section>
        )}

        {/* Payout */}
        {data.payout && (
          <Section title="Payout" icon={DollarSign}>
            <Field label="Amount" value={`$${parseFloat(data.payout.amount).toFixed(2)}`} />
            <Field label="Method" value={data.payout.method} />
            <Field label="Status" value={data.payout.status} />
            <Field label="Transaction Ref" value={data.payout.transaction_ref} />
          </Section>
        )}

        {/* Verification */}
        {data.verification && (
          <Section title="Verification" icon={ClipboardCheck}>
            <Field label="Approved" value={data.verification.approved ? "Yes" : "No"} />
            <Field label="Condition Match" value={data.verification.condition_match ? "Yes" : "No"} />
            <Field label="Actual Condition" value={data.verification.condition_actual} />
            <Field label="Notes" value={data.verification.notes} />
          </Section>
        )}
      </div>

      {/* Audit Trail */}
      {data.auditTrail?.length > 0 && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4">Audit Trail</h3>
          <div className="space-y-2">
            {data.auditTrail.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-white/[0.04] last:border-0">
                <span className="text-xs text-[#706557] w-36 shrink-0">{new Date(a.created_at).toLocaleString()}</span>
                <span className="text-[#c3bbad]">{a.action}</span>
                <span className="text-xs text-[#706557]">by {a.actor_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
