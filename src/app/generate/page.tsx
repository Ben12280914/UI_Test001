import Link from "next/link";
import { GenerateForm } from "@/components/report/GenerateForm";
import { ReportStatusBadge } from "@/components/ui/Badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { AUDIENCE_LABELS } from "@/domain/constants";
import { periodFor } from "@/domain/period";
import { fmtDateTime } from "@/lib/format";
import { getEngine } from "@/server/ai";
import { getStore } from "@/server/store/jsonFileStore";
import { activeCycle } from "@/server/workflow/dashboardService";

export default async function GeneratePage() {
  const d = await getStore().read();
  const cycle = activeCycle(d);
  const month = periodFor("monthly", new Date());
  const defaults = cycle
    ? { type: cycle.reportType, start: cycle.periodStart, end: cycle.periodEnd, cycleId: cycle.id, cycleLabel: cycle.label }
    : { type: "monthly" as const, start: month.start, end: month.end };
  const activities = d.activities.filter((a) => !a.duplicateOf).map((a) => ({ date: a.activityDate, project: a.projectName }));
  const drafts = d.reports.filter((r) => r.status !== "ARCHIVED").sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        step="STEP 04 · 실행 / Generate"
        title="Report Generator"
        description="기간과 보고 대상을 선택하면, 이지가 해당 기간의 Work Memory를 읽고 보고서 초안을 작성합니다."
      />
      <GenerateForm activities={activities} defaults={defaults} aiLabel={getEngine().label} />
      {drafts.length > 0 && (
        <section className="card">
          <div className="card-header">
            <div className="card-title">진행 중인 보고서</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {drafts.map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-slate-50">
                  <span>
                    <span className="font-medium text-navy-800">{r.title}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {AUDIENCE_LABELS[r.audience]} · v{r.versions.at(-1)?.version} · {fmtDateTime(r.createdAt)}
                    </span>
                  </span>
                  <ReportStatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
