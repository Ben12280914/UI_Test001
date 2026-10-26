import Link from "next/link";
import { Brain, Trash2 } from "lucide-react";
import { AddMissingActivity } from "@/components/memory/AddMissingActivity";
import { EditActivity } from "@/components/memory/EditActivity";
import { ActionButton } from "@/components/ui/ActionButton";
import { ActivityStatusBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { SourceIcon } from "@/components/ui/SourceIcon";
import { CHANNEL_LABELS, SOURCE_TYPE_LABELS } from "@/domain/constants";
import { toIsoDate } from "@/domain/period";
import { cx } from "@/lib/format";
import { getStore } from "@/server/store/jsonFileStore";
import { activeCycle } from "@/server/workflow/dashboardService";

export default async function MemoryPage({ searchParams }: { searchParams: Promise<{ month?: string; project?: string; source?: string; focus?: string }> }) {
  const q = await searchParams;
  const d = await getStore().read();
  const cycle = activeCycle(d);
  const months = [...new Set(d.activities.map((a) => a.activityDate.slice(0, 7)))].sort().reverse();
  const month = q.month ?? (cycle?.reportType === "monthly" ? cycle.periodStart.slice(0, 7) : months[0]) ?? "";
  const list = d.activities
    .filter((a) => !month || month === "all" || a.activityDate.startsWith(month))
    .filter((a) => !q.project || a.projectName === q.project)
    .filter((a) => !q.source || a.sourceType === q.source)
    .sort((a, b) => b.activityDate.localeCompare(a.activityDate) || a.projectName.localeCompare(b.projectName));
  const projects = [...new Set(d.activities.map((a) => a.projectName))].sort();
  const docs = new Map(d.documents.map((x) => [x.id, x]));
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { month, project: q.project, source: q.source, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/memory?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        step="Work Memory"
        title="Work Memory"
        description="자료에서 추출되거나 직접 입력한 업무 기록입니다. 보고서는 이 기록만을 근거로 작성되며, 모든 Activity는 원본 위치(Source Reference)를 가집니다."
        actions={
          <Link href="/generate" className="btn-primary">
            보고서 생성 →
          </Link>
        }
      />

      <AddMissingActivity projects={d.settings.projects} defaultDate={toIsoDate(new Date())} />

      <section className="card">
        <div className="card-header flex-wrap">
          <div className="card-title">Activities ({list.length})</div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {["all", ...months].map((m) => (
              <Link key={m} href={link({ month: m })} className={cx("chip py-1", m === month ? "bg-navy-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                {m === "all" ? "전체" : m}
              </Link>
            ))}
            <span className="mx-1 h-4 w-px bg-slate-200" />
            {(["excel", "ppt", "pdf", "email", "text", "manual"] as const).map((s) => (
              <Link
                key={s}
                href={link({ source: q.source === s ? undefined : s })}
                className={cx("chip py-1", q.source === s ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
              >
                {SOURCE_TYPE_LABELS[s]}
              </Link>
            ))}
          </div>
        </div>
        {q.project && (
          <div className="border-b border-slate-100 px-5 py-2 text-xs text-slate-500">
            Project: <b className="text-navy-800">{q.project}</b>{" "}
            <Link href={link({ project: undefined })} className="ml-1 text-brand-600">
              해제
            </Link>
          </div>
        )}
        {list.length === 0 ? (
          <EmptyState icon={<Brain className="h-8 w-8" />} title="이 조건의 Work Memory가 없습니다">
            Data Space에 자료를 올리거나, 위에서 기록되지 않은 업무를 추가하세요.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((a) => (
              <li key={a.id} id={a.id} className={cx("px-5 py-4", q.focus === a.id && "bg-brand-50/50", a.duplicateOf && "opacity-60")}>
                <div className="flex items-start gap-4">
                  <SourceIcon type={a.sourceType} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums text-xs font-semibold text-slate-500">{a.activityDate}</span>
                      <Link href={link({ project: a.projectName })} className="text-sm font-semibold text-navy-900 hover:underline">
                        {a.projectName}
                      </Link>
                      <span className="text-xs text-slate-400">· {a.activityType}</span>
                      <ActivityStatusBadge status={a.status} />
                      <span className="chip bg-slate-100 text-slate-500">{CHANNEL_LABELS[a.channel]}</span>
                      {a.duplicateOf && <span className="chip bg-amber-50 text-amber-700">중복</span>}
                      {a.confidence < 0.6 && <span className="chip bg-amber-50 text-amber-700">낮은 신뢰도</span>}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">{a.description}</div>
                    <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs md:grid-cols-2">
                      {a.achievement && (
                        <div>
                          <dt className="inline font-semibold text-emerald-700">Achievement </dt>
                          <dd className="inline text-slate-600">{a.achievement}</dd>
                        </div>
                      )}
                      {a.issue && (
                        <div>
                          <dt className="inline font-semibold text-amber-700">Issue </dt>
                          <dd className="inline text-slate-600">{a.issue}</dd>
                        </div>
                      )}
                      {a.risk && (
                        <div>
                          <dt className="inline font-semibold text-brand-700">Risk </dt>
                          <dd className="inline text-slate-600">{a.risk}</dd>
                        </div>
                      )}
                      {a.nextAction && (
                        <div>
                          <dt className="inline font-semibold text-navy-700">Next </dt>
                          <dd className="inline text-slate-600">{a.nextAction}</dd>
                        </div>
                      )}
                      {a.kpis.length > 0 && (
                        <div className="md:col-span-2">
                          <dt className="inline font-semibold text-navy-700">KPI </dt>
                          <dd className="inline text-slate-600">{a.kpis.map((k) => `${k.name} ${k.value}${k.unit ?? ""}`).join(" · ")}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {a.sourceRefs.length === 0 ? (
                        <span className="chip bg-violet-50 text-violet-700">Manual entry · 근거 문서 없음</span>
                      ) : (
                        a.sourceRefs.map((r) => (
                          <Link
                            key={r.chunkId}
                            href={`/data-space/${r.documentId}?chunk=${r.chunkId}#${r.chunkId}`}
                            className="chip bg-sky-50 py-1 text-sky-700 hover:bg-sky-100"
                            title={r.quote}
                          >
                            {docs.get(r.documentId)?.fileName ?? a.sourceFile} · {r.locator}
                          </Link>
                        ))
                      )}
                      {a.flags
                        .filter((f) => !f.startsWith("수기 입력"))
                        .map((f) => (
                          <span key={f} className="chip bg-slate-100 font-normal text-slate-500">
                            {f}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="mr-2 text-[11px] tabular-nums text-slate-400" title="추출 신뢰도">
                      {Math.round(a.confidence * 100)}%
                    </span>
                    <EditActivity activity={a} projects={projects} />
                    <ActionButton url={`/api/activities/${a.id}`} method="DELETE" className="btn-ghost btn-sm" confirm="이 Activity를 삭제할까요?" title="삭제">
                      <Trash2 className="h-3.5 w-3.5" />
                    </ActionButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
