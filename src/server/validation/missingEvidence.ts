import type { Report, SourceDocument, WorkActivity } from "@/domain/types";
import { inPeriod } from "@/domain/period";

export interface MissingCandidate {
  activity: WorkActivity;
  document?: SourceDocument;
  reason: string;
}

/**
 * Activities recorded for the report period that no report item cites (and the user has not ignored).
 * This is the "빠진 업무가 없는지" check.
 */
export function detectMissingEvidence(report: Report, activities: WorkActivity[], documents: SourceDocument[]): MissingCandidate[] {
  const cited = new Set(report.sections.flatMap((s) => s.items.flatMap((i) => i.activityIds)));
  const ignored = new Set(report.ignoredActivityIds);
  const docs = new Map(documents.map((d) => [d.id, d]));
  return activities
    .filter((a) => !a.duplicateOf && inPeriod(a.activityDate, report.periodStart, report.periodEnd))
    .filter((a) => !cited.has(a.id) && !ignored.has(a.id))
    .map((a) => ({
      activity: a,
      document: a.sourceDocumentId ? docs.get(a.sourceDocumentId) : undefined,
      reason:
        a.sourceType === "manual"
          ? "수기로 등록한 업무가 이번 보고서에 포함되지 않았습니다."
          : "관련 자료는 존재하지만 이번 보고서에는 포함되지 않았습니다.",
    }));
}
