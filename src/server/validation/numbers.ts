/**
 * Numeric facts in a sentence ("24명", "84.6%", "3건") — used to check that every number the AI writes
 * is present in the cited source. Dates, years and list numbering are not treated as facts here.
 */
export function extractNumericFacts(text: string): string[] {
  const withoutDates = text
    .replace(/20\d{2}[-./]\d{1,2}(?:[-./]\d{1,2})?/g, " ")
    .replace(/(?:20\d{2}\s*년\s*)?\d{1,2}\s*월(?:\s*\d{1,2}\s*일)?/g, " ")
    .replace(/\b\d{1,2}\s*일\b/g, " ")
    .replace(/\bQ[1-4]\b/gi, " ")
    .replace(/\bv\d+(?:\.\d+)*\b/gi, " ")
    .replace(/^\s*\d{1,2}[.)]\s/gm, " ");
  const out = new Set<string>();
  for (const m of withoutDates.matchAll(/(?<![\w.])(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(?![\w])/g)) {
    const normalized = normalizeNumber(m[0]);
    const n = Number(normalized);
    if (Number.isNaN(n)) continue;
    if (/^20\d{2}$/.test(normalized)) continue; // bare years
    out.add(normalized);
  }
  return [...out];
}

export function normalizeNumber(s: string): string {
  const cleaned = s.replace(/,/g, "");
  return cleaned.includes(".") ? String(Number(cleaned)) : cleaned.replace(/^0+(?=\d)/, "");
}

/** All numbers that appear in a source text, normalized. */
export function numbersInSource(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/g)) out.add(normalizeNumber(m[0]));
  return out;
}
