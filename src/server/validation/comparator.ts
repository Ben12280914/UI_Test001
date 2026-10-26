import type { ProjectSnapshot, Report, WorkActivity } from "@/domain/types";
import { sameProject } from "./duplicates";

export type ChangeKind = "NEW" | "PROGRESS" | "COMPLETED" | "DELAYED_RISK" | "UNCHANGED";

export interface ProjectChange {
  projectName: string;
  kind: ChangeKind;
  previous?: ProjectSnapshot;
  current?: ProjectSnapshot;
  note: string;
}

const STATUS_RANK: Record<ProjectSnapshot["status"], number> = {
  planned: 0,
  on_hold: 0,
  in_progress: 1,
  delayed: 1,
  completed: 2,
};

/** Latest status per project, from the activities a report cites. */
export function snapshotProjects(activities: WorkActivity[]): ProjectSnapshot[] {
  const byProject = new Map<string, WorkActivity[]>();
  for (const a of activities) {
    const key = [...byProject.keys()].find((k) => sameProject(k, a.projectName)) ?? a.projectName;
    byProject.set(key, [...(byProject.get(key) ?? []), a]);
  }
  return [...byProject.entries()].map(([projectName, list]) => {
    const sorted = [...list].sort((x, y) => x.activityDate.localeCompare(y.activityDate));
    const last = sorted[sorted.length - 1];
    return {
      projectName,
      status: last.status,
      activityCount: list.length,
      hasRisk: list.some((a) => Boolean(a.risk) || a.status === "delayed"),
      lastActivityDate: last.activityDate,
    };
  });
}

export function compareSnapshots(current: ProjectSnapshot[], previous: ProjectSnapshot[]): ProjectChange[] {
  const changes: ProjectChange[] = [];
  for (const cur of current) {
    const prev = previous.find((p) => sameProject(p.projectName, cur.projectName));
    let kind: ChangeKind;
    let note: string;
    if (!prev) {
      kind = "NEW";
      note = "이번 기간에 새로 등장한 과제입니다.";
    } else if (cur.status === "completed" && prev.status !== "completed") {
      kind = "COMPLETED";
      note = "이번 기간에 완료되었습니다.";
    } else if (cur.status === "delayed" || (cur.hasRisk && !prev.hasRisk)) {
      kind = "DELAYED_RISK";
      note = cur.status === "delayed" ? "일정 지연 상태입니다." : "새로운 Risk가 보고되었습니다.";
    } else if (STATUS_RANK[cur.status] !== STATUS_RANK[prev.status] || cur.lastActivityDate > prev.lastActivityDate) {
      kind = "PROGRESS";
      note =
        cur.status !== prev.status
          ? `상태 변경: ${prev.status} → ${cur.status}`
          : `진행 중 · 이번 기간 활동 ${cur.activityCount}건`;
    } else {
      kind = "UNCHANGED";
      note = "변화가 없습니다.";
    }
    changes.push({ projectName: cur.projectName, kind, previous: prev, current: cur, note });
  }
  for (const prev of previous) {
    if (current.some((c) => sameProject(c.projectName, prev.projectName))) continue;
    if (prev.status === "completed") continue; // closed last period, nothing to carry over
    changes.push({
      projectName: prev.projectName,
      kind: "UNCHANGED",
      previous: prev,
      note: "지난 보고 이후 이번 기간 활동 기록이 없습니다.",
    });
  }
  const order: ChangeKind[] = ["NEW", "COMPLETED", "DELAYED_RISK", "PROGRESS", "UNCHANGED"];
  return changes.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export function findPreviousReport(current: Report, reports: Report[]): Report | undefined {
  return reports
    .filter(
      (r) =>
        r.id !== current.id &&
        r.type === current.type &&
        r.periodEnd < current.periodStart &&
        (r.status === "ARCHIVED" || r.status === "APPROVED"),
    )
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
}
