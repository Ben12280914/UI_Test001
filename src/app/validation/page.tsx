import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ReportStatusBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { AUDIENCE_LABELS } from "@/domain/constants";
import { getStore } from "@/server/store/jsonFileStore";
import { validationSummary } from "@/server/workflow/reportService";

export default async function ValidationListPage() {
  const d = await getStore().read();
  const reports = d.reports
    .filter((r) => ["DRAFT", "READY_FOR_REVIEW", "CHANGES_REQUESTED"].includes(r.status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="space-y-6">
      <PageHeader
        step="STEP 05 · 검토 / Validation"
        title="Validation"
        description="AI가 작성한 모든 문장은 근거 Activity와 원본 위치로 연결됩니다. Source가 없거나 수치가 원문과 다르면 표시되고, 사람이 확인해야 다음 단계로 넘어갑니다."
      />
      <div className="card">
        {reports.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="검증할 보고서가 없습니다">
            <Link href="/generate" className="text-navy-700 underline">
              Report Generator
            </Link>
            에서 초안을 만들어 주세요.
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Status</th>
                <th className="text-right">Verified</th>
                <th className="text-right">Source Found</th>
                <th className="text-right">Review Required</th>
                <th className="text-right">No Source</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const s = validationSummary(r);
                return (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/reports/${r.id}`} className="font-semibold text-navy-900 hover:underline">
                        {r.title}
                      </Link>
                      <div className="text-xs text-slate-400">
                        {r.periodStart} ~ {r.periodEnd} · {AUDIENCE_LABELS[r.audience]}
                      </div>
                    </td>
                    <td>
                      <ReportStatusBadge status={r.status} />
                    </td>
                    <td className="text-right tabular-nums text-emerald-600">{s.verified}</td>
                    <td className="text-right tabular-nums text-sky-600">{s.sourceFound}</td>
                    <td className="text-right tabular-nums text-amber-600">{s.reviewRequired}</td>
                    <td className="text-right tabular-nums text-brand-600">{s.noSource}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
