import type { ReportingCycle, ReportType, StoreData, TriggerEvent } from "@/domain/types";
import { REPORT_TYPE_LABELS } from "@/domain/constants";
import { periodFor, periodLabel, toIsoDate, type Period } from "@/domain/period";
import type { TriggerAdapter, TriggerPayload } from "../adapters";
import { newId, nowIso } from "../ids";
import { getStore } from "../store/jsonFileStore";
import { dueReports } from "./schedule";

function upsertCycle(d: StoreData, type: ReportType, period: Period, triggerId: string, today: string): ReportingCycle {
  const now = nowIso();
  let cycle = d.cycles.find((c) => c.reportType === type && c.periodStart === period.start && c.periodEnd === period.end);
  if (!cycle) {
    cycle = {
      id: newId("cyc"),
      reportType: type,
      periodStart: period.start,
      periodEnd: period.end,
      label: `${periodLabel(type, period).replace(/ (Monthly|Weekly|Annual)$/, "")} ${REPORT_TYPE_LABELS[type]} Report`,
      triggerIds: [triggerId],
      state: "notified",
      createdAt: now,
      updatedAt: now,
    };
    d.cycles.push(cycle);
  } else {
    cycle.triggerIds.push(triggerId);
    if (cycle.state === "snoozed" && (!cycle.snoozeUntil || cycle.snoozeUntil <= today)) cycle.state = "notified";
    cycle.updatedAt = now;
  }
  return cycle;
}

/**
 * Step 01 → 02: record the trigger, and if a report is due, raise (or re-raise) the reporting notification.
 * A GPS arrival on a day with nothing due is recorded but does not notify.
 */
export async function receiveTrigger(adapter: TriggerAdapter, payload: TriggerPayload, now = new Date()) {
  const ev = adapter.toEvent(payload);
  return getStore().update((d) => {
    const trigger: TriggerEvent = { id: newId("trg"), type: ev.type, source: ev.source, payload: ev.payload, receivedAt: nowIso() };
    d.triggers.push(trigger);
    d.triggers = d.triggers.slice(-200);
    const today = toIsoDate(now);
    const due = ev.reportType
      ? [{ reportType: ev.reportType, period: periodFor(ev.reportType as Exclude<ReportType, "custom">, now), reason: "Trigger에서 지정" }]
      : dueReports(now, d.settings);
    const cycles = due
      .filter((x) => !d.cycles.some((c) => c.reportType === x.reportType && c.periodStart === x.period.start && c.state === "skipped"))
      .map((x) => upsertCycle(d, x.reportType, x.period, trigger.id, today));
    return { trigger, cycles, due };
  });
}

export async function cycleAction(cycleId: string, action: "start" | "snooze" | "skip") {
  return getStore().update((d) => {
    const c = d.cycles.find((x) => x.id === cycleId);
    if (!c) throw new Error("보고 주기를 찾을 수 없습니다.");
    if (action === "start") c.state = "started";
    if (action === "skip") c.state = "skipped";
    if (action === "snooze") {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      c.state = "snoozed";
      c.snoozeUntil = toIsoDate(t);
    }
    c.updatedAt = nowIso();
    return c;
  });
}
