import type { Kpi, SourceChunk } from "@/domain/types";
import { isValidIsoDate } from "@/domain/period";
import { numbersInSource, normalizeNumber } from "../validation/numbers";
import type { DraftItem, ExtractedActivity, ProposalDraft, RevisionTarget } from "./engine";

const squash = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export interface SanitizedActivity extends ExtractedActivity {
  flags: string[];
}

/**
 * Guardrails applied to every extracted activity, from either engine:
 *  - source references must point at real chunks of this document
 *  - quotes must be verbatim (otherwise replaced by the chunk text and flagged)
 *  - KPI values must appear in the cited chunks (otherwise removed and flagged)
 *  - an activity with no remaining source is dropped (AI may not invent work)
 */
export function sanitizeExtracted(
  extracted: ExtractedActivity[],
  chunks: SourceChunk[],
  fallbackDate: string,
): { kept: SanitizedActivity[]; dropped: number } {
  const byId = new Map(chunks.map((c) => [c.id, c]));
  const kept: SanitizedActivity[] = [];
  let dropped = 0;

  for (const a of extracted) {
    const flags: string[] = [];
    let confidence = Math.max(0, Math.min(1, a.confidence));

    const refs = a.sourceRefs
      .filter((r) => byId.has(r.chunkId))
      .map((r) => {
        const chunk = byId.get(r.chunkId)!;
        if (r.quote && squash(chunk.text).includes(squash(r.quote))) return r;
        flags.push(`인용문이 원문과 일치하지 않아 ${chunk.locator} 원문으로 대체`);
        confidence = Math.min(confidence, 0.7);
        return { chunkId: r.chunkId, quote: chunk.text.slice(0, 200) };
      });
    if (refs.length === 0) {
      dropped++;
      continue;
    }

    const sourceNumbers = numbersInSource(refs.map((r) => byId.get(r.chunkId)!.text).join("\n"));
    const kpis: Kpi[] = [];
    for (const k of a.kpis) {
      if (sourceNumbers.has(normalizeNumber(k.value))) kpis.push(k);
      else flags.push(`KPI '${k.name} ${k.value}${k.unit ?? ""}' 제거: Source에서 확인되지 않음`);
    }

    let activityDate = a.activityDate;
    if (!isValidIsoDate(activityDate)) {
      activityDate = fallbackDate;
      flags.push("날짜가 명시되지 않아 문서 날짜로 지정");
      confidence = Math.min(confidence, 0.75);
    }

    kept.push({ ...a, activityDate, sourceRefs: refs, kpis, confidence, flags });
  }
  return { kept, dropped };
}

/** Draft items may only cite activities that were handed to the engine. */
export function sanitizeDraft(items: DraftItem[], allowedActivityIds: Set<string>): DraftItem[] {
  return items
    .map((i) => ({ ...i, text: i.text.trim(), activityIds: [...new Set(i.activityIds.filter((id) => allowedActivityIds.has(id)))] }))
    .filter((i) => i.text.length > 0);
}

export function sanitizeProposals(proposals: ProposalDraft[], targets: RevisionTarget[], allowedActivityIds: Set<string>): ProposalDraft[] {
  const targetIds = new Set(targets.map((t) => t.itemId));
  return proposals
    .filter((p) => targetIds.has(p.itemId) && p.suggested.trim())
    .map((p) => ({ ...p, activityIds: [...new Set(p.activityIds.filter((id) => allowedActivityIds.has(id)))] }));
}
