"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import type { WorkActivity } from "@/domain/types";
import { api } from "@/lib/api";
import { ActivityForm, type ActivityFormValue } from "./ActivityForm";

export function EditActivity({ activity, projects }: { activity: WorkActivity; projects: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ActivityFormValue>({
    activityDate: activity.activityDate,
    projectName: activity.projectName,
    department: activity.department ?? "",
    activityType: activity.activityType,
    description: activity.description,
    channel: activity.channel,
    status: activity.status,
    achievement: activity.achievement ?? "",
    issue: activity.issue ?? "",
    risk: activity.risk ?? "",
    nextAction: activity.nextAction ?? "",
  });
  if (!open)
    return (
      <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(true)} title="수정">
        <Pencil className="h-3.5 w-3.5" />
      </button>
    );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-6" onClick={() => setOpen(false)}>
      <div className="card w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div className="card-title">Activity 수정</div>
          <span className="text-xs text-slate-400">수정 내용은 이 Activity를 인용한 초안 보고서의 검증 상태에 반영됩니다.</span>
        </div>
        <div className="px-5 py-4">
          <ActivityForm value={form} onChange={setForm} projects={projects} />
          {error && <div className="mt-2 text-sm text-brand-600">{error}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              취소
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await api(`/api/activities/${activity.id}`, "PATCH", form);
                  setOpen(false);
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
