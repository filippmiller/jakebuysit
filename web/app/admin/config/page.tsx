"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { Save, RefreshCw } from "lucide-react";

export default function AdminConfigPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await adminApi.getConfig();
      setConfigs(result.config || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (key: string, value: any) => {
    setEditing(key);
    setEditValue(JSON.stringify(value, null, 2));
  };

  const saveConfig = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const parsed = JSON.parse(editValue);
      await adminApi.updateConfig(editing, parsed);
      setEditing(null);
      load();
    } catch (e: any) {
      alert(e.message || "Invalid JSON or save failed");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#706557]">System configuration. Changes require super_admin role.</p>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm text-[#706557] hover:text-[#f5f0e8] transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {configs.map((c: any) => (
        <div key={c.key} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#f5f0e8] font-mono">{c.key}</h3>
            {editing !== c.key ? (
              <button onClick={() => startEdit(c.key, c.value)}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="text-xs text-[#706557] hover:text-[#f5f0e8]">Cancel</button>
                <button onClick={saveConfig} disabled={saving}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                  <Save className="w-3 h-3" /> Save
                </button>
              </div>
            )}
          </div>

          {editing === c.key ? (
            <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)}
              rows={12}
              className="w-full bg-white/[0.03] border border-white/[0.1] rounded-lg p-3 text-xs font-mono text-[#c3bbad] focus:border-amber-500/40 focus:outline-none resize-y" />
          ) : (
            <pre className="text-xs font-mono text-[#a89d8a] bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 overflow-auto max-h-64">
              {JSON.stringify(c.value, null, 2)}
            </pre>
          )}

          {c.updated_at && (
            <p className="text-xs text-[#706557] mt-2">Last updated: {new Date(c.updated_at).toLocaleString()}</p>
          )}
        </div>
      ))}
    </div>
  );
}
