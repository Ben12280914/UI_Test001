import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Eye, GitCompare, History, Printer, ShieldCheck } from "lucide-react";
import { ComparePanel } from "@/components/report/ComparePanel";
import { SlidePreview } from "@/components/report/SlidePreview";
import { ValidationWorkspace } from "@/components/report/ValidationWorkspace";
import { VersionHistory } from "@/components/report/VersionHistory";
import { ActionButton } from "@/components/ui/ActionButton";
import { ReportStatusBadge } from "@/components/ui/Badges";
import { PrintButton } from "@/components/ui/PrintButton";
import { AUDIENCE_LABELS } from "@/domain/constants";
import type { SourceChunk, SourceDocument, WorkActivity } from "@/domain/types";
import { cx } from "@/lib/format";
import { getStore } from "@/server/store/jsonFileStore";
import { getReportView } from "@/server/workflow/reportService";

const TABS = [
  { key: "validation", label: "Validation", icon: ShieldCheck },
  { key: "preview", label: "Report Preview", icon: Eye },
  { key: "compare", label: "Compare", icon: GitCompare },
  { key: "versions", label: "Version History", icon: History },
] as const;

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; v?: string }> }) {
  const { id } = await params;
  const { tab: tabParam, v } = await searchParams;
  let view;
  try {
    view = await getReportView(id);
  } catch {
    notFound();
  }
  const { report, summary, missing, changes, previous } = view;
  const editable = ["DRAFT", "READY_FOR_REVIEW", "CHANGES_REQUESTED"].includes(report.status);
  const tab = tabParam ?? (editable ? "validation" : "preview");

  // Evidence needed by the client: cited activities, their chunks and documents.
  const d = await getStore().read();
  const citedIds = new Set(report.sections.flatMap((s) => s.items.flatMap((i) => i.activityIds)));
  const activities: Record<string, WorkActivity> = {};
  for (const a of d.activities) if (citedIds.has(a.id)) activities[a.id] = a;
  const chunkIds = new Set(Object.values(activities).flatMap((a) => a.sourceRefs.map((r) => r.chunkId)));
  const chunks: Record<string, SourceChunk> = {};
  for (const c of d.chunks) if (chunkIds.has(c.id)) chunks[c.id] = c;
  const documents: Record<string, Pick<SourceDocument, "id" | "fileName" | "sourceType">> = {};
  for (const doc of d.documents) documents[doc.id] = { id: doc.id, fileName: doc.fileName, sourceType: doc.sourceType };

  const pending = summary.noSource + summary.reviewRequired;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600">STEP 05 · 검토 / Validation</div>
          <h1 className="text-2xl font-bold tracking-tight">{report.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <ReportStatusBadge status={report.status} />
            <span>
              {report.periodStart} ~ {report.periodEnd}
            </span>
            <span>· {AUDIENCE_LABELS[report.audience]}</span>
            <span>
              · v{report.versions.at(-1)?.version} {report.versions.at(-1)?.label}
            </span>
            <span>· {report.generatedBy === "ai" ? "Claude 생성" : "Rule 엔진 생성"}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {report.status === "DRAFT" && (
            <>
              <ActionButton url={`/api/reports/${report.id}`} method="DELETE" className="btn-ghost" confirm="이 초안을 삭제할까요?" redirect="/generate">
                초안 삭제
              </ActionButton>
              <ActionButton url={`/api/reports/${report.id}`} body={{ action: "verifyAll" }} disabled={summary.sourceFound === 0}>
                Source Found 일괄 확인
              </ActionButton>
              <ActionButton url={`/api/reports/${report.id}`} body={{ action: "markReady" }} className="btn-primary" disabled={pending > 0}>
                Validation 완료
              </ActionButton>
            </>
          )}
          {(report.status === "READY_FOR_REVIEW" || report.status === "CHANGES_REQUESTED") && (
            <Link href={`/approval/${report.id}`} className="btn-primary">
              {report.status === "CHANGES_REQUESTED" ? "피드백 반영 · 재상신" : "메모결재 상신"} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {!editable && (
            <Link href={`/approval/${report.id}`} className="btn-outline">
              결재 현황
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Items", value: summary.total, cls: "text-navy-900" },
          { label: "VERIFIED", value: summary.verified, cls: "text-emerald-600" },
          { label: "SOURCE FOUND", value: summary.sourceFound, cls: "text-sky-600" },
          { label: "REVIEW REQUIRED", value: summary.reviewRequired, cls: "text-amber-600" },
          { label: "NO SOURCE", value: summary.noSource, cls: "text-brand-600" },
        ].map((k) => (
          <div key={k.label} className="card px-4 py-3">
            <div className="text-[11px] font-semibold tracking-wide text-slate-500">{k.label}</div>
            <div className={cx("text-2xl font-bold tabular-nums", k.cls)}>{k.value}</div>
          </div>
        ))}
      </div>

      {missing.length > 0 && (
        <section className="card border-amber-200">
          <div className="card-header bg-amber-50/60">
            <div className="card-title flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Potential Missing Activities ({missing.length})
            </div>
            <span className="text-xs text-slate-500">이번 보고서에서 빠진 업무가 없는지 확인하세요.</span>
          </div>
          <ol className="divide-y divide-slate-100">
            {missing.map((m, i) => (
              <li key={m.activity.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                <span className="w-5 text-sm font-bold text-slate-400">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-navy-900">
                    {m.activity.projectName} <span className="font-normal text-slate-500">· {m.activity.description}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {m.reason}
                    {m.document && ` (${m.document.fileName})`} · {m.activity.activityDate}
                  </div>
                </div>
                {editable && (
                  <div className="flex gap-2">
                    <ActionButton url={`/api/reports/${report.id}`} body={{ action: "addActivity", activityId: m.activity.id }} className="btn-navy btn-sm">
                      Add to Report
                    </ActionButton>
                    <ActionButton url={`/api/reports/${report.id}`} body={{ action: "ignoreActivity", activityId: m.activity.id }} className="btn-ghost btn-sm">
                      Ignore
                    </ActionButton>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex items-center justify-between border-b border-slate-200">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/reports/${report.id}?tab=${t.key}`}
              className={cx(
                "-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium",
                tab === t.key ? "border-brand-500 text-navy-900" : "border-transparent text-slate-500 hover:text-navy-800",
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
              {t.key === "compare" && previous && <span className="chip bg-slate-100 text-slate-500">{changes.length}</span>}
            </Link>
          ))}
        </nav>
        {tab === "preview" && (
          <PrintButton>
            <Printer className="h-4 w-4" /> 인쇄 / PDF
          </PrintButton>
        )}
      </div>

      {tab === "validation" && <ValidationWorkspace report={report} activities={activities} chunks={chunks} documents={documents} editable={editable} />}
      {tab === "preview" && <SlidePreview report={report} />}
      {tab === "compare" && <ComparePanel changes={changes} previous={previous} />}
      {tab === "versions" && <VersionHistory report={report} selected={v} />}
    </div>
  );
}
