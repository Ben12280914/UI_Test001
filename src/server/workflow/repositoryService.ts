import type { Report } from "@/domain/types";
import { adapters, NotConfiguredError } from "../adapters";
import { nowIso } from "../ids";
import { getStore } from "../store/jsonFileStore";
import { snapshotVersion } from "./reportService";

/** Step 08: only an APPROVED report becomes Final v1.0 and is archived. */
export async function finalizeAndArchive(reportId: string): Promise<{ report: Report; external: string }> {
  const store = getStore();
  const d = await store.read();
  const report = d.reports.find((r) => r.id === reportId);
  if (!report) throw new Error("보고서를 찾을 수 없습니다.");
  if (report.status !== "APPROVED") throw new Error("팀장 승인(APPROVED) 전에는 Final 처리할 수 없습니다.");

  const { path } = await adapters.repository.archive(report);
  let external = "";
  try {
    await adapters.externalRepository.archive(report);
    external = "report.taekwang.com 저장 완료";
  } catch (err) {
    if (!(err instanceof NotConfiguredError)) throw err;
    external = err.message;
  }

  const updated = await store.update((dd) => {
    const r = dd.reports.find((x) => x.id === reportId)!;
    const now = nowIso();
    snapshotVersion(r, "Final", dd.settings.userName, "1.0");
    r.status = "ARCHIVED";
    r.finalizedAt = now;
    r.archive = { adapter: adapters.repository.name, path, archivedAt: now };
    r.updatedAt = now;
    return r;
  });
  return { report: updated, external };
}

export interface RepositoryQuery {
  year?: string;
  type?: string;
  project?: string;
  department?: string;
  keyword?: string;
  status?: string;
}

export async function searchRepository(q: RepositoryQuery) {
  const d = await getStore().read();
  const kw = q.keyword?.trim().toLowerCase();
  const project = q.project?.trim().toLowerCase();
  const reports = d.reports
    .filter((r) => r.status === "ARCHIVED" || r.status === "APPROVED" || q.status === "all")
    .filter((r) => !q.year || r.periodStart.startsWith(q.year))
    .filter((r) => !q.type || r.type === q.type)
    .filter((r) => !q.status || q.status === "all" || r.status === q.status)
    .filter((r) => !q.department || (r.department ?? "").includes(q.department))
    .filter((r) => !project || r.projectSnapshots.some((p) => p.projectName.toLowerCase().includes(project)))
    .filter(
      (r) =>
        !kw ||
        r.title.toLowerCase().includes(kw) ||
        r.sections.some((s) => s.items.some((i) => i.text.toLowerCase().includes(kw))),
    )
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  const years = [...new Set(d.reports.map((r) => r.periodStart.slice(0, 4)))].sort().reverse();
  const projects = [...new Set(d.reports.flatMap((r) => r.projectSnapshots.map((p) => p.projectName)))].sort();
  return { reports, years, projects };
}
