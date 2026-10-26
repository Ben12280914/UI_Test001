import { isValidIsoDate, toIsoDate } from "@/domain/period";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function iso(y: number, m: number, d: number): string | undefined {
  const s = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return isValidIsoDate(s) ? s : undefined;
}

/**
 * Find calendar dates written in a piece of text. Korean "10월 20일" without a year uses `refYear`.
 * Returns dates in order of appearance.
 */
export function findDates(text: string, refYear: number): string[] {
  const found: { idx: number; date: string }[] = [];
  const push = (idx: number, date: string | undefined) => {
    if (date) found.push({ idx, date });
  };
  for (const m of text.matchAll(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/g)) {
    push(m.index ?? 0, iso(+m[1], +m[2], +m[3]));
  }
  for (const m of text.matchAll(/(?:(20\d{2})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)) {
    push(m.index ?? 0, iso(m[1] ? +m[1] : refYear, +m[2], +m[3]));
  }
  for (const m of text.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})/gi)) {
    push(m.index ?? 0, iso(+m[3], MONTHS[m[1].toLowerCase()], +m[2]));
  }
  for (const m of text.matchAll(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)[a-z]*\.?\s+(20\d{2})/gi)) {
    push(m.index ?? 0, iso(+m[3], MONTHS[m[2].toLowerCase()], +m[1]));
  }
  return found.sort((a, b) => a.idx - b.idx).map((f) => f.date);
}

export function firstDate(text: string, refYear: number): string | undefined {
  return findDates(text, refYear)[0];
}

export function dateFromCell(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // exceljs stores date cells at UTC midnight
    return iso(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === "string") return firstDate(value, new Date().getFullYear());
  return undefined;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}
