import Link from "next/link";
import { Archive, CheckCircle2, Folder, FolderOpen, Search } from "lucide-react";
import { ReportStatusBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { REPORT_TYPE_LABELS } from "@/domain/constants";
import type { ReportType } from "@/domain/types";
import { cx, fmtDateTime } from "@/lib/format";
import { searchRepository, type RepositoryQuery } from "@/server/workflow/repositoryService";

const TYPES: ReportType[] = ["weekly", "monthly", "quarterly", "annual", "custom"];

export default async function RepositoryPage({ searchParams }: { searchParams: Promise<RepositoryQuery & { saved?: string }> }) {
  const q = await searchParams;
  const { reports, years, projects } = await searchRepository(q);
  const tree = new Map<string, Map<ReportType, typeof reports>>();
  for (const r of reports) {
    const y = r.periodStart.slice(0, 4);
    if (!tree.has(y)) tree.set(y, new Map());
    const byType = tree.get(y)!;
    byType.set(r.type, [...(byType.get(r.type) ?? []), r]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        step="STEP 08 · 완성 / Repository"
        title="Report Repository"
        description="승인된 최종 보고서가 보관되는 곳입니다. 다음 보고서를 만들 때 비교 기준으로 다시 쓰입니다."
      />

      {q.saved && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> Final 보고서가 Repository에 저장되었습니다.
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-4 border-navy-200 bg-navy-50/40 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-800 text-white">
          <Archive className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-navy-900">report.taekwang.com · 중앙 Reporting Repository (Concept)</div>
          <div className="text-xs text-slate-500">
            현재는 이지 내부 Repository에 보관합니다. 중앙 Repository의 API와 접근 방법이 제공되면 ReportRepositoryAdapter만 교체해 같은 구조로 저장합니다.
          </div>
        </div>
        <span className="chip bg-white text-slate-500 ring-1 ring-slate-200">연동 예정</span>
      </div>

      <form className="card grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-6" action="/repository">
        <div>
          <label className="label">Period (Year)</label>
          <select name="year" defaultValue={q.year ?? ""} className="input">
            <option value="">전체</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Report Type</label>
          <select name="type" defaultValue={q.type ?? ""} className="input">
            <option value="">전체</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {REPORT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Project</label>
          <select name="project" defaultValue={q.project ?? ""} className="input">
            <option value="">전체</option>
            {projects.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Department</label>
          <input name="department" defaultValue={q.department ?? ""} className="input" placeholder="예) OPEX" />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={q.status ?? ""} className="input">
            <option value="">Final · Approved</option>
            <option value="ARCHIVED">Final만</option>
            <option value="APPROVED">Approved만</option>
            <option value="all">모든 상태</option>
          </select>
        </div>
        <div>
          <label className="label">Keyword</label>
          <div className="flex gap-1.5">
            <input name="keyword" defaultValue={q.keyword ?? ""} className="input" placeholder="내용 검색" />
            <button className="btn-navy px-3" type="submit" aria-label="검색">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="card self-start px-4 py-4 text-sm">
          <div className="label">Repository 구조</div>
          {tree.size === 0 ? (
            <div className="text-xs text-slate-400">—</div>
          ) : (
            [...tree.entries()].map(([year, byType]) => (
              <div key={year} className="mb-2">
                <div className="flex items-center gap-1.5 font-semibold text-navy-900">
                  <FolderOpen className="h-4 w-4 text-amber-500" /> {year}
                </div>
                <ul className="ml-2 border-l border-slate-200 pl-3">
                  {(["weekly", "monthly", "quarterly", "annual"] as ReportType[]).map((t) => (
                    <li key={t} className="py-0.5">
                      <div className={cx("flex items-center gap-1.5", byType.get(t) ? "text-navy-800" : "text-slate-400")}>
                        <Folder className="h-3.5 w-3.5" /> {REPORT_TYPE_LABELS[t]}
                      </div>
                      <ul className="ml-2 border-l border-slate-100 pl-3">
                        {(byType.get(t) ?? []).map((r) => (
                          <li key={r.id} className="truncate py-0.5 text-xs">
                            <Link href={`/reports/${r.id}?tab=preview`} className="text-slate-600 hover:text-navy-800 hover:underline">
                              {r.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="card">
          {reports.length === 0 ? (
            <EmptyState icon={<Archive className="h-8 w-8" />} title="조건에 맞는 보고서가 없습니다" />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Type</th>
                  <th>Period</th>
                  <th>Projects</th>
                  <th>Version</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/reports/${r.id}?tab=preview`} className="font-semibold text-navy-900 hover:underline">
                        {r.title}
                      </Link>
                      <div className="text-[11px] text-slate-400">{r.archive ? `${r.archive.path} · ${fmtDateTime(r.archive.archivedAt)}` : r.department}</div>
                    </td>
                    <td className="text-xs">{REPORT_TYPE_LABELS[r.type]}</td>
                    <td className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                      {r.periodStart} ~ {r.periodEnd}
                    </td>
                    <td className="text-xs text-slate-600">{r.projectSnapshots.map((p) => p.projectName).join(", ")}</td>
                    <td className="text-xs">v{r.versions.at(-1)?.version}</td>
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
    </div>
  );
}
