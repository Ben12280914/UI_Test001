import type { ReportType } from "./types";

// Dates are handled as plain YYYY-MM-DD strings in local business time to avoid TZ drift.

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isValidIsoDate(s: string | undefined | null): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseIsoDate(s);
  return !Number.isNaN(d.getTime()) && toIsoDate(d) === s;
}

export function inPeriod(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export interface Period {
  start: string;
  end: string;
}

/** Period that contains `ref` for the given report type. */
export function periodFor(type: Exclude<ReportType, "custom">, ref: Date): Period {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  switch (type) {
    case "weekly": {
      // Monday..Sunday week
      const dow = (ref.getDay() + 6) % 7;
      const start = new Date(y, m, ref.getDate() - dow);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
    case "monthly":
      return { start: toIsoDate(new Date(y, m, 1)), end: toIsoDate(new Date(y, m + 1, 0)) };
    case "quarterly": {
      const q = Math.floor(m / 3);
      return { start: toIsoDate(new Date(y, q * 3, 1)), end: toIsoDate(new Date(y, q * 3 + 3, 0)) };
    }
    case "annual":
      return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
}

/** The period immediately before `p` of the same type (used for comparison). */
export function previousPeriod(type: ReportType, p: Period): Period {
  const start = parseIsoDate(p.start);
  if (type === "custom") {
    const days = Math.round((parseIsoDate(p.end).getTime() - start.getTime()) / 86400000) + 1;
    const prevEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
    const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - days + 1);
    return { start: toIsoDate(prevStart), end: toIsoDate(prevEnd) };
  }
  const dayBefore = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
  return periodFor(type, dayBefore);
}

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function periodLabel(type: ReportType, p: Period): string {
  const s = parseIsoDate(p.start);
  switch (type) {
    case "monthly":
      return `${p.start.slice(0, 7)} Monthly`;
    case "quarterly":
      return `${s.getFullYear()} Q${Math.floor(s.getMonth() / 3) + 1}`;
    case "annual":
      return `${s.getFullYear()} Annual`;
    case "weekly":
      return `${p.start} Weekly`;
    default:
      return `${p.start} ~ ${p.end}`;
  }
}

export function monthNameEn(isoDate: string): string {
  return MONTHS_EN[parseIsoDate(isoDate).getMonth()];
}

export function monthNameKo(isoDate: string): string {
  return `${parseIsoDate(isoDate).getMonth() + 1}월`;
}
