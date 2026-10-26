import Link from "next/link";
import { ACTIVITY_STATUS_LABELS } from "@/domain/constants";
import type { ChangeKind, ProjectChange } from "@/server/validation/comparator";
import { cx } from "@/lib/format";
import { EmptyState } from "@/components/ui/PageHeader";

const KIND: Record<ChangeKind, { label: string; desc: string; cls: string }> = {
  NEW: { label: "NEW", desc: "신규 과제", cls: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" },
  PROGRESS: { label: "PROGRESS", desc: "기존 과제 진행 · 상태 변경", cls: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" },
  COMPLETED: { label: "COMPLETED", desc: "완료된 과제", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  DELAYED_RISK: { label: "DELAYED / RISK", desc: "일정 지연 또는 Risk 발생", cls: "bg-brand-50 text-brand-700 ring-1 ring-brand-200" },
  UNCHANGED: { label: "UNCHANGED", desc: "변화 없는 과제", cls: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" },
};

export function ComparePanel({ changes, previous }: { changes: ProjectChange[]; previous?: { id: string; title: string } }) {
  if (!previous)
    return (
      <div className="card">
        <EmptyState title="비교할 이전 보고서가 없습니다">같은 유형의 이전 기간 보고서가 승인·보관되면 자동으로 비교합니다.</EmptyState>
      </div>
    );
  const kinds = Object.keys(KIND) as ChangeKind[];
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        <Link href={`/reports/${previous.id}?tab=preview`} className="font-semibold text-navy-800 hover:underline">
          {previous.title}
        </Link>{" "}
        → 이번 보고서 · 지난 보고 이후 무엇이 달라졌는가?
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kinds.map((k) => (
          <div key={k} className="card px-4 py-3">
            <span className={cx("chip", KIND[k].cls)}>{KIND[k].label}</span>
            <div className="mt-2 text-2xl font-bold tabular-nums text-navy-900">{changes.filter((c) => c.kind === k).length}</div>
            <div className="text-[11px] text-slate-500">{KIND[k].desc}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Change</th>
              <th>Project</th>
              <th>이전</th>
              <th>이번</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.projectName}>
                <td>
                  <span className={cx("chip", KIND[c.kind].cls)}>{KIND[c.kind].label}</span>
                </td>
                <td className="font-semibold text-navy-900">{c.projectName}</td>
                <td className="text-xs text-slate-500">{c.previous ? ACTIVITY_STATUS_LABELS[c.previous.status] : "—"}</td>
                <td className="text-xs text-slate-700">{c.current ? ACTIVITY_STATUS_LABELS[c.current.status] : "—"}</td>
                <td className="text-xs text-slate-500">{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
