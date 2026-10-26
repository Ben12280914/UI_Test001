import Link from "next/link";
import { ArrowRight, Check, Clock, FileText } from "lucide-react";
import { NotificationBanner } from "@/components/dashboard/NotificationBanner";
import { TriggerSimulator } from "@/components/dashboard/TriggerSimulator";
import { JourneyBar } from "@/components/JourneyBar";
import { ReportStatusBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { PIPELINE_STAGES, REPORT_TYPE_LABELS, WORKFLOW_STEPS } from "@/domain/constants";
import { cx, fmtDateTime } from "@/lib/format";
import { getDashboard } from "@/server/workflow/dashboardService";

const TRIGGER_LABEL: Record<string, string> = {
  GPS_ARRIVAL: "GPS Trigger Received",
  REPORTING_SCHEDULE: "Reporting Schedule Trigger",
  MANUAL: "Manual Trigger",
};

const NEXT_ACTION: Record<string, { text: string; href: (reportId?: string) => string; cta: string }> = {
  trigger: { text: "출근 Trigger 또는 보고 일정 이벤트를 기다리는 중입니다.", href: () => "/", cta: "Trigger 시뮬레이션" },
  notice: { text: "보고 시점 알림을 확인하고 [보고서 준비 시작]을 눌러주세요.", href: () => "/", cta: "알림 확인" },
  collect: { text: "Data Space에 이번 기간 자료를 올리고, 기록되지 않은 업무를 추가하세요.", href: () => "/data-space", cta: "Data Space" },
  generate: { text: "Work Memory가 준비되었습니다. 보고서 초안을 생성하세요.", href: () => "/generate", cta: "Report Generator" },
  validate: { text: "AI 초안의 Source를 확인하고 검증을 완료하세요.", href: (id) => (id ? `/reports/${id}` : "/validation"), cta: "Validation" },
  submit: { text: "검증이 끝났습니다. 팀장에게 메모결재를 상신하세요.", href: (id) => (id ? `/approval/${id}` : "/approval"), cta: "메모결재" },
  review: { text: "팀장 Review 단계입니다. 피드백을 확인하고 반영하세요.", href: (id) => (id ? `/approval/${id}` : "/approval"), cta: "Approval" },
  complete: { text: "승인되었습니다. Final 확정 후 Repository에 저장하세요.", href: (id) => (id ? `/approval/${id}` : "/repository"), cta: "Final 저장" },
};

function Kpi({ label, value, sub, tone = "navy" }: { label: string; value: number | null; sub?: string; tone?: "navy" | "brand" | "amber" }) {
  return (
    <div className="card px-5 py-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div
        className={cx(
          "mt-1 text-3xl font-bold tabular-nums",
          value === null ? "text-slate-300" : tone === "brand" ? "text-brand-600" : tone === "amber" ? "text-amber-600" : "text-navy-900",
        )}
      >
        {value === null ? "—" : value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const v = await getDashboard();
  const { journey, kpis } = v;
  const current = journey.steps.find((s) => s.state === "current")?.key;
  const lastTrigger = v.notification ? v.recentTriggers.find((t) => v.notification!.triggerIds.includes(t.id)) : undefined;
  const next = current ? NEXT_ACTION[current] : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        step="Home / Dashboard"
        title={`안녕하세요, ${v.userName}님`}
        description="업무를 하는 동안 자료는 Work Memory에 쌓이고, 보고 시점이 되면 이지가 먼저 보고서 작성을 제안합니다."
        actions={<TriggerSimulator />}
      />

      {v.notification && <NotificationBanner cycle={v.notification} triggerLabel={lastTrigger ? TRIGGER_LABEL[lastTrigger.type] : undefined} />}

      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{journey.cycle ? journey.cycle.label : "Reporting Workflow"}</div>
            <div className="text-xs text-slate-500">
              {journey.cycle ? `${journey.cycle.periodStart} ~ ${journey.cycle.periodEnd}` : "진행 중인 보고 주기가 없습니다."}
            </div>
          </div>
          {journey.report && <ReportStatusBadge status={journey.report.status} />}
        </div>
        <div className="px-5 py-5">
          <ol className="grid grid-cols-6 gap-2">
            {PIPELINE_STAGES.map((key) => {
              const st = journey.stages.find((s) => s.key === key)?.state ?? "todo";
              return (
                <li
                  key={key}
                  className={cx(
                    "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-bold tracking-wide",
                    !journey.cycle && "bg-slate-50 text-slate-300",
                    journey.cycle && st === "done" && "bg-navy-800 text-white",
                    journey.cycle && st === "current" && "bg-brand-500 text-white shadow-sm",
                    journey.cycle && st === "todo" && "bg-slate-100 text-slate-400",
                  )}
                >
                  {journey.cycle && st === "done" && <Check className="h-3.5 w-3.5" />}
                  {key}
                </li>
              );
            })}
          </ol>
          <div className="mt-6 rounded-lg bg-slate-50 px-4 py-4">
            <JourneyBar steps={journey.steps} reportId={journey.report?.id} compact />
          </div>
          {next && journey.cycle && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-3">
              <div className="text-sm text-slate-600">
                <span className="mr-2 font-semibold text-brand-600">
                  STEP {WORKFLOW_STEPS.find((s) => s.key === current)?.no}
                </span>
                {next.text}
              </div>
              <Link href={next.href(journey.report?.id)} className="btn-primary btn-sm">
                {next.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Documents" value={kpis.documents} sub="Data Space 자료" />
        <Kpi label="Work Activities" value={kpis.activities} sub={kpis.activitiesInPeriod !== null ? `이번 보고 기간 ${kpis.activitiesInPeriod}건` : "중복 제외"} />
        <Kpi label="Projects" value={kpis.projects} sub="Work Memory 기준" />
        <Kpi
          label="Missing Evidence"
          value={kpis.missingEvidence}
          sub={journey.report?.status === "ARCHIVED" ? "Final 확정 완료" : kpis.missingEvidence === null ? "보고서 초안 생성 후 표시" : "보고서에 빠진 업무"}
          tone="amber"
        />
        <Kpi label="Review Required" value={kpis.reviewRequired} sub={kpis.reviewRequired === null ? "보고서 초안 생성 후 표시" : "Review Required + No Source"} tone="brand" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">최근 Trigger</div>
            <span className="text-xs text-slate-400">GPS · Schedule · Power Automate</span>
          </div>
          {v.recentTriggers.length === 0 ? (
            <EmptyState title="수신된 Trigger가 없습니다">상단의 시뮬레이션 버튼 또는 Webhook으로 Trigger를 보낼 수 있습니다.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {v.recentTriggers.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="font-medium text-navy-800">{TRIGGER_LABEL[t.type]}</span>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="chip bg-slate-100 text-slate-600">{t.source}</span>
                    <Clock className="h-3 w-3" /> {fmtDateTime(t.receivedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {v.due.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              보고 일정: {v.due.map((d) => `${REPORT_TYPE_LABELS[d.reportType]} (${d.period.start} ~ ${d.period.end}) — ${d.reason}`).join(" · ")}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">최근 보고서</div>
            <Link href="/repository" className="text-xs font-medium text-navy-600 hover:underline">
              Repository →
            </Link>
          </div>
          {v.recentReports.length === 0 ? (
            <EmptyState icon={<FileText className="h-8 w-8" />} title="아직 보고서가 없습니다" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {v.recentReports.map((r) => (
                <li key={r.id}>
                  <Link href={`/reports/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-navy-800">{r.title}</span>
                      <span className="text-xs text-slate-400">
                        v{r.versions.at(-1)?.version} · {fmtDateTime(r.updatedAt)}
                      </span>
                    </span>
                    <ReportStatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
