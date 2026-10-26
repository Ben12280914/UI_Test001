import type { ItemValidation, ReportItem, SourceChunk, WorkActivity } from "@/domain/types";
import { extractNumericFacts, numbersInSource } from "./numbers";

export interface EvidenceContext {
  activities: Map<string, WorkActivity>;
  chunks: Map<string, SourceChunk>;
}

export const LOW_CONFIDENCE = 0.6;

/** Text an item can be checked against: activity fields + the source chunks they cite. */
export function evidenceText(activityIds: string[], ctx: EvidenceContext): string {
  const parts: string[] = [];
  for (const id of activityIds) {
    const a = ctx.activities.get(id);
    if (!a) continue;
    parts.push(a.description, a.achievement ?? "", a.issue ?? "", a.risk ?? "", a.nextAction ?? "");
    for (const k of a.kpis) parts.push(`${k.name} ${k.value}${k.unit ?? ""}`);
    for (const r of a.sourceRefs) {
      const chunk = ctx.chunks.get(r.chunkId);
      parts.push(chunk?.text ?? r.quote);
    }
  }
  return parts.join("\n");
}

/**
 * Deterministic validation of one report item. The LLM never decides these statuses.
 * VERIFIED is only kept when a person verified it and the item still has a source.
 */
export function validateItem(item: Pick<ReportItem, "text" | "activityIds" | "verifiedAt">, ctx: EvidenceContext): ItemValidation {
  const checkedAt = new Date().toISOString();
  const cited = item.activityIds.map((id) => ctx.activities.get(id)).filter((a): a is WorkActivity => Boolean(a));

  if (cited.length === 0) {
    return {
      status: "NO_SOURCE",
      reasons: [item.activityIds.length ? "인용한 Work Activity가 존재하지 않습니다." : "근거가 연결되지 않은 문장입니다."],
      checkedAt,
    };
  }

  const reasons: string[] = [];
  const withDocument = cited.filter((a) => a.sourceRefs.some((r) => ctx.chunks.has(r.chunkId)));
  if (withDocument.length === 0) {
    reasons.push("근거 문서 없이 수기 입력된 업무만 인용합니다. 내용을 직접 확인하세요.");
  }

  const evidence = numbersInSource(evidenceText(item.activityIds, ctx));
  const missingNumbers = extractNumericFacts(item.text).filter((n) => !evidence.has(n));
  if (missingNumbers.length) {
    reasons.push(`수치 ${missingNumbers.map((n) => `'${n}'`).join(", ")}이(가) Source에서 확인되지 않습니다.`);
  }

  const lowConf = cited.filter((a) => a.confidence < LOW_CONFIDENCE);
  if (lowConf.length) reasons.push("AI 추출 신뢰도가 낮은 Activity를 인용합니다.");

  if (reasons.length) {
    if (item.verifiedAt && missingNumbers.length === 0) {
      return { status: "VERIFIED", reasons: ["사용자가 내용을 확인했습니다.", ...reasons], checkedAt };
    }
    return { status: "REVIEW_REQUIRED", reasons, checkedAt };
  }
  if (item.verifiedAt) return { status: "VERIFIED", reasons: ["Source 확인 완료"], checkedAt };
  return { status: "SOURCE_FOUND", reasons: [`근거 ${withDocument.length}건 연결`], checkedAt };
}

export function buildEvidenceContext(activities: WorkActivity[], chunks: SourceChunk[]): EvidenceContext {
  return {
    activities: new Map(activities.map((a) => [a.id, a])),
    chunks: new Map(chunks.map((c) => [c.id, c])),
  };
}
