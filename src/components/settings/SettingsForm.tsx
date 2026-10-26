"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Settings } from "@/domain/types";
import { api } from "@/lib/api";

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div>
        <label className="label">작성자</label>
        <input className="input" value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
      </div>
      <div>
        <label className="label">부서</label>
        <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
      </div>
      <div>
        <label className="label">결재자 (팀장)</label>
        <input className="input" value={form.reviewerName} onChange={(e) => setForm({ ...form, reviewerName: e.target.value })} />
      </div>
      <div>
        <label className="label">월간보고 알림 (월말 N일 전)</label>
        <input type="number" min={0} max={20} className="input" value={form.monthlyLeadDays} onChange={(e) => setForm({ ...form, monthlyLeadDays: Number(e.target.value) })} />
      </div>
      <div className="col-span-2 flex items-center gap-3 md:col-span-4">
        <button
          type="button"
          className="btn-navy"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              await api("/api/settings", "PATCH", form);
              setMsg("저장되었습니다.");
              router.refresh();
            } catch (err) {
              setMsg(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} 저장
        </button>
        {msg && <span className="text-sm text-slate-600">{msg}</span>}
      </div>
    </div>
  );
}
