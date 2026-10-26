import Link from "next/link";
import { Stamp } from "lucide-react";
import { ReportStatusBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { fmtDateTime } from "@/lib/format";
import { getStore } from "@/server/store/jsonFileStore";

export default async function ApprovalListPage() {
  const d = await getStore().read();
  const reports = d.reports
    .filter((r) => r.status !== "DRAFT" && r.status !== "ARCHIVED")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="space-y-6">
      <PageHeader
        step="STEP 06 · 보고 / Memo Approval"
        title="Approval"
        description="검증이 끝난 보고서를 팀장에게 메모결재로 상신합니다. 사내 메모결재 API가 연결되기 전까지는 Mock 결재로 동작합니다."
      />
      <div className="card">
        {reports.length === 0 ? (
          <EmptyState icon={<Stamp className="h-8 w-8" />} title="결재 진행 중인 보고서가 없습니다">
            Validation을 완료한 보고서가 여기에 표시됩니다.
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Submitter</th>
                <th>Reviewer</th>
                <th>Submitted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/approval/${r.id}`} className="font-semibold text-navy-900 hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td>{r.approval?.submitter ?? r.author}</td>
                  <td>{r.approval?.reviewer ?? d.settings.reviewerName}</td>
                  <td className="text-xs text-slate-500">{r.approval ? fmtDateTime(r.approval.submittedAt) : "—"}</td>
                  <td>
                    <ReportStatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
