"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { StatusBadge } from "@/components/admin/DataTable";
import { ArrowLeft, Ban, Shield, Save } from "lucide-react";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, any>>({});

  useEffect(() => {
    adminApi.getUser(id).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (Object.keys(edits).length === 0) return;
    setSaving(true);
    try {
      await adminApi.updateUser(id, edits);
      const refreshed = await adminApi.getUser(id);
      setData(refreshed);
      setEdits({});
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const toggleBan = async () => {
    const isBanned = data.user.banned;
    const reason = isBanned ? null : prompt("Ban reason:");
    if (!isBanned && !reason) return;
    setSaving(true);
    try {
      await adminApi.updateUser(id, { banned: !isBanned, ban_reason: reason });
      const refreshed = await adminApi.getUser(id);
      setData(refreshed);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data?.user) return <p className="text-[#706557] text-center py-12">User not found</p>;

  const u = data.user;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[#706557] hover:text-[#f5f0e8]">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-xl font-bold text-[#f5f0e8]">{u.email}</h2>
        <StatusBadge status={u.role} />
        {u.banned && <StatusBadge status="Banned" variant="rejected" />}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#f5f0e8]">Profile</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-[#706557]">Name:</span> <span className="text-[#c3bbad]">{u.name || "—"}</span></div>
            <div><span className="text-[#706557]">Phone:</span> <span className="text-[#c3bbad]">{u.phone || "—"}</span></div>
            <div><span className="text-[#706557]">Auth:</span> <span className="text-[#c3bbad]">{u.auth_provider || "email"}</span></div>
            <div><span className="text-[#706557]">Verified:</span> <span className="text-[#c3bbad]">{u.verified ? "Yes" : "No"}</span></div>
            <div><span className="text-[#706557]">Familiarity:</span> <span className="text-[#c3bbad]">{u.jake_familiarity}</span></div>
            <div><span className="text-[#706557]">Jake Bucks:</span> <span className="text-amber-400">${parseFloat(u.jake_bucks_balance).toFixed(2)}</span></div>
            <div><span className="text-[#706557]">Joined:</span> <span className="text-[#c3bbad]">{new Date(u.created_at).toLocaleDateString()}</span></div>
          </div>
        </div>

        {/* Admin Controls */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#f5f0e8]">Admin Controls</h3>

          <div>
            <label className="text-xs text-[#706557] block mb-1">Role</label>
            <select value={edits.role ?? u.role}
              onChange={(e) => setEdits((p) => ({ ...p, role: e.target.value }))}
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#c3bbad] focus:outline-none">
              {["user","admin","super_admin","reviewer","warehouse"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-[#706557] block mb-1">Trust Score: {edits.trust_score ?? u.trust_score}</label>
            <input type="range" min="0" max="100" step="1"
              value={edits.trust_score ?? u.trust_score}
              onChange={(e) => setEdits((p) => ({ ...p, trust_score: Number(e.target.value) }))}
              className="w-full accent-amber-500" />
          </div>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving || Object.keys(edits).length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-sm hover:bg-amber-500/20 disabled:opacity-40 transition-colors">
              <Save className="w-4 h-4" /> Save Changes
            </button>
            <button onClick={toggleBan} disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                u.banned
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
              }`}>
              {u.banned ? <Shield className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              {u.banned ? "Unban" : "Ban User"}
            </button>
          </div>
        </div>
      </div>

      {/* Offers */}
      {data.offers?.length > 0 && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#f5f0e8] mb-4">Offer History ({data.offers.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-[#706557] border-b border-white/[0.08]">
                <th className="text-left py-2 px-3">Item</th><th className="text-left py-2 px-3">Amount</th>
                <th className="text-left py-2 px-3">Status</th><th className="text-left py-2 px-3">Date</th>
              </tr></thead>
              <tbody>
                {data.offers.map((o: any) => (
                  <tr key={o.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer"
                    onClick={() => router.push(`/admin/offers/${o.id}`)}>
                    <td className="py-2 px-3 text-[#c3bbad]">{o.item_brand} {o.item_model || ""}</td>
                    <td className="py-2 px-3 text-[#c3bbad]">{o.offer_amount ? `$${parseFloat(o.offer_amount).toFixed(2)}` : "—"}</td>
                    <td className="py-2 px-3"><StatusBadge status={o.status} /></td>
                    <td className="py-2 px-3 text-[#706557]">{new Date(o.created_at).toLocaleDateString()}</td>
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
