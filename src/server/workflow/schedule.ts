import { periodFor, previousPeriod, toIsoDate, parseIsoDate, type Period } from "@/domain/period";
import type { ReportType, Settings } from "@/domain/types";

export interface DueReport {
  reportType: ReportType;
  period: Period;
  reason: string;
}

/**
 * Reporting calendar. A monthly report is due from `monthlyLeadDays` before month end
 * until the 5th of the following month (for the month just closed).
 */
export function dueReports(now: Date, settings: Settings): DueReport[] {
  const out: DueReport[] = [];
  const today = toIsoDate(now);
  const month = periodFor("monthly", now);
  const daysLeft = Math.round((parseIsoDate(month.end).getTime() - parseIsoDate(today).getTime()) / 86400000);
  if (daysLeft <= settings.monthlyLeadDays) {
    out.push({ reportType: "monthly", period: month, reason: `월말까지 ${daysLeft}일 남았습니다.` });
  } else if (now.getDate() <= 5) {
    out.push({ reportType: "monthly", period: previousPeriod("monthly", month), reason: "지난 달 월간보고 마감 기간입니다." });
  }
  // Quarterly report alongside the last monthly report of a quarter.
  const quarter = periodFor("quarterly", now);
  if (quarter.end === month.end && daysLeft <= settings.monthlyLeadDays) {
    out.push({ reportType: "quarterly", period: quarter, reason: "분기 마감이 다가옵니다." });
  }
  if (now.getMonth() === 11 && daysLeft <= settings.monthlyLeadDays) {
    out.push({ reportType: "annual", period: periodFor("annual", now), reason: "연간보고 시점입니다." });
  }
  return out;
}
