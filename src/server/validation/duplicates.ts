import type { WorkActivity } from "@/domain/types";

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export function sameProject(a: string, b: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  return n(a) === n(b);
}

/**
 * Mark activities that describe the same work (same project, dates within 3 days, similar text).
 * The earliest-created activity is kept as the canonical one.
 */
export function markDuplicates(activities: WorkActivity[]): Map<string, string> {
  const dupOf = new Map<string, string>();
  const sorted = [...activities].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    if (dupOf.has(a.id)) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (dupOf.has(b.id) || !sameProject(a.projectName, b.projectName)) continue;
      const dayGap = Math.abs(new Date(a.activityDate).getTime() - new Date(b.activityDate).getTime()) / 86400000;
      if (dayGap > 3) continue;
      if (similarity(a.description, b.description) >= 0.6) dupOf.set(b.id, a.id);
    }
  }
  return dupOf;
}
