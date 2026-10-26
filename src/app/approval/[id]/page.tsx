import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Check, FileText, Lock } from "lucide-react";
import { FeedbackRevision } from "@/components/approval/FeedbackRevision";
import { ReviewerSimulator } from "@/components/approval/ReviewerSimulator";
import { SubmitPanel } from "@/components/approval/SubmitPanel";
import { ActionButton } from "@/components/ui/ActionButton";
import { ReportStatusBadge } from "@/components/ui/Badges";
import type { ReportStatus, ValidationStatus } from "@/domain/types";
import { cx, fmtDateTime } from "@/lib/format";
import { adapters } from "@/server/adapters";
import { getEngine } from "@/server/ai";
import { getStore } from "@/server/store/jsonFileStore";
import { validationSummary } from "@/server/workflow/reportService";

const FLOW: { key: ReportStatus | "CHANGES_OR_APPROVED"; label: string }[] = [
  { key: "DRAFT", label: "DRAFT" },
  { key: "READY_FOR_REVIEW", label: "READY FOR REVIEW" },
  { key: "SUBMITTED", label: "SUBMITTED" },
  { key: "IN_REVIEW", label: "IN REVIEW" },
  { key: "CHANGES_OR_APPROVED", label: "CHANGES REQUESTED / APPROVED" },
];

function flowIndex(s: ReportStatus): number {
  return { DRAFT: 0, READY_FOR_REVIEW: 1, SUBMITTED: 2, IN_REVIEW: 3, CHANGES_REQUESTED: 4, APPROVED: 4, ARCHIVED: 5 }[s];
}

export default async function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getStore().read();
  const report = d.reports.find((r) => r.id === id);
  if (!report) notFound();
  const summary = validationSummary(report);
  const idx = flowIndex(report.status);
  const approval = report.approval;
  const lastReviewerComment = [...(approval?.comments ?? [])].reverse().find((c) => c.role === "reviewer");
  const pendingProposals = report.proposals.filter((p) => p.status === "pending").length;
  const canSubmit = report.status === "READY_FOR_REVIEW" || report.status === "CHANGES_REQUESTED";
  const blockers = [
    ...(summary.noSource || summary.reviewRequired ? [`Validation 미완료 항목 ${summary.noSource + summary.reviewRequired}건 — Validation 화면에서 확인하세요.`] : []),
    ...(pendingProposals ? [`처리하지 않은 AI 수정 제안 ${pendingProposals}건`] : []),
  ];
  const itemStatus: Record<string, ValidationStatus> = {};
  for (const s of report.sections) for (const i of s.items) itemStatus[i.id] = i.validation.status;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600">STEP 06–08 · 보고 · REVIEW · 완성</div>
          <h1 className="text-2xl font-bold tracking-tight">메모결재 · {report.title}</h1>
        </div>
        <Link href={`/reports/${report.id}?tab=preview`} className="btn-outline">
          <FileText className="h-4 w-4" /> 보고서 보기
        </Link>
      </div>

      <ol className="grid grid-cols-5 gap-2">
        {FLOW.map((f, i) => (
          <li
            key={f.key}
            className={cx(
              "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-center text-[11px] font-bold tracking-wide",
              i < idx && "bg-navy-800 text-white",
              i === idx && (report.status === "CHANGES_REQUESTED" ? "bg-amber-500 text-white" : "bg-brand-500 text-white"),
              i > idx && "bg-slate-100 text-slate-400",
              idx === 5 && "bg-navy-800 text-white",
            )}
          >
            {(i < idx || idx === 5) && <Check className="h-3.5 w-3.5" />}
            {i === 4 && idx === 4 ? report.status.replace("_", " ") : f.label}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card">
            <div className="card-header">
              <div className="card-title">메모결재 문서</div>
              <span className="text-xs text-slate-400">{adapters.approval.name}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 text-sm md:grid-cols-3">
              <div>
                <dt className="label">Report</dt>
                <dd className="font-semibold text-navy-900">{report.title}</dd>
              </div>
              <div>
                <dt className="label">Submitter</dt>
                <dd>{approval?.submitter ?? d.settings.userName}</dd>
              </div>
              <div>
                <dt className="label">Reviewer</dt>
                <dd>{approval?.reviewer ?? d.settings.reviewerName}</dd>
              </div>
              <div>
                <dt className="label">Submitted Date</dt>
                <dd>{approval ? fmtDateTime(approval.submittedAt) : "—"}</dd>
              </div>
              <div>
                <dt className="label">Status</dt>
                <dd>
                  <ReportStatusBadge status={report.status} />
                </dd>
              </div>
              <div>
                <dt className="label">결재 번호</dt>
                <dd className="font-mono text-xs">{approval?.externalRef ?? "—"}</dd>
              </div>
            </dl>
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="label">Comment</div>
              {approval?.comments.length ? (
                <ul className="space-y-2">
                  {approval.comments.map((c, i) => (
                    <li key={i} className={cx("rounded-lg px-3 py-2 text-sm", c.role === "reviewer" ? "bg-amber-50" : "bg-slate-50")}>
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-navy-800">
                          {c.author} {c.role === "reviewer" ? "(Reviewer)" : "(Submitter)"}
                        </span>
                        <span className="text-slate-400">{fmtDateTime(c.at)}</span>
                      </div>
                      <div className="mt-0.5 text-slate-700">{c.text}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-400">아직 Comment가 없습니다.</div>
              )}
            </div>
          </section>

          {(report.status === "CHANGES_REQUESTED" || report.proposals.length > 0) && (
            <section className="card">
              <div className="card-header">
                <div className="card-title">STEP 07 · REVIEW — 피드백 반영</div>
                <span className="text-xs text-slate-400">Original → Feedback → Suggested Revision</span>
              </div>
              <div className="px-5 py-4">
                <FeedbackRevision
                  reportId={report.id}
                  comment={report.status === "CHANGES_REQUESTED" ? lastReviewerComment?.text : undefined}
                  proposals={report.proposals}
                  itemStatus={itemStatus}
                  editable={report.status === "CHANGES_REQUESTED"}
                  aiLabel={getEngine().label}
                />
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          {report.status === "DRAFT" && (
            <div className="card px-5 py-4 text-sm text-slate-600">
              Validation이 끝나야 상신할 수 있습니다.
              <Link href={`/reports/${report.id}`} className="btn-primary btn-sm mt-3 w-full">
                Validation으로 이동
              </Link>
            </div>
          )}
          {canSubmit && (
            <div className="card px-5 py-4">
              <div className="card-title mb-3">{report.status === "CHANGES_REQUESTED" ? "수정본 재상신" : "STEP 06 · 메모결재 상신"}</div>
              <SubmitPanel reportId={report.id} resubmit={report.status === "CHANGES_REQUESTED"} blockers={blockers} />
            </div>
          )}
          {(report.status === "SUBMITTED" || report.status === "IN_REVIEW") && adapters.approval.isMock && (
            <ReviewerSimulator reportId={report.id} status={report.status} reviewer={approval?.reviewer ?? d.settings.reviewerName} />
          )}
          {report.status === "APPROVED" && (
            <div className="card border-emerald-200 px-5 py-4">
              <div className="card-title mb-1">STEP 08 · 완성</div>
              <p className="mb-3 text-sm text-slate-600">팀장 승인이 완료되었습니다. Final(v1.0)로 확정하고 Repository에 저장합니다.</p>
              <ActionButton url={`/api/repository/${report.id}/finalize`} className="btn-primary w-full" redirect="/repository?saved=1">
                <Archive className="h-4 w-4" /> Final 확정 · Repository 저장
              </ActionButton>
            </div>
          )}
          {report.status === "ARCHIVED" && (
            <div className="card px-5 py-4 text-sm">
              <div className="card-title mb-1 flex items-center gap-1.5">
                <Lock className="h-4 w-4" /> Final 보관 완료
              </div>
              <div className="text-slate-600">{report.archive?.path}</div>
              <div className="mt-1 text-xs text-slate-400">{report.archive && fmtDateTime(report.archive.archivedAt)}</div>
              <Link href="/repository" className="btn-outline btn-sm mt-3 w-full">
                Repository 보기
              </Link>
            </div>
          )}
          <div className="card px-5 py-4">
            <div className="label">Version History</div>
            <ol className="space-y-1.5 text-sm">
              {report.versions.map((v) => (
                <li key={v.version} className="flex items-center justify-between">
                  <span>
                    <b className="text-navy-900">v{v.version}</b> <span className="text-slate-600">{v.label}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">{fmtDateTime(v.createdAt)}</span>
                </li>
              ))}
            </ol>
            <Link href={`/reports/${report.id}?tab=versions`} className="mt-2 inline-block text-xs text-navy-600 hover:underline">
              버전별 변경 내용 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
