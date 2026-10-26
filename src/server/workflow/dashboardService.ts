import type { Report, ReportingCycle, StoreData } from "@/domain/types";
import { PIPELINE_STAGES, WORKFLOW_STEPS, type PipelineStage, type WorkflowStepKey } from "@/domain/constants";
import { inPeriod, toIsoDate } from "@/domain/period";
import { getStore } from "../store/jsonFileStore";
import { detectMissingEvidence } from "../validation/missingEvidence";
import { dueReports, type DueReport } from "./schedule";
import { validationSummary } from "./reportService";

export type StepState = "done" | "current" | "todo";

export interface JourneyView {
  cycle?: ReportingCycle;
  report?: Report;
  steps: { key: WorkflowStepKey; state: StepState }[];
  stage?: PipelineStage;
  stages: { key: PipelineStage; state: StepState }[];
}

const POST_SUBMIT = ["SUBMITTED", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "ARCHIVED"];

/** The cycle the user is working on: newest one that is not skipped. */
export function activeCycle(d: StoreData): ReportingCycle | undefined {
  return [...d.cycles].filter((c) => c.state !== "skipped").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function journeyFor(d: StoreData, cycle?: ReportingCycle): JourneyView {
  const report = cycle?.reportId ? d.reports.find((r) => r.id === cycle.reportId) : undefined;
  const hasActivities =
    !!cycle && d.activities.some((a) => !a.duplicateOf && inPeriod(a.activityDate, cycle.periodStart, cycle.periodEnd));
  const st = report?.status;
  const done: Record<WorkflowStepKey, boolean> = {
    trigger: !!cycle && cycle.triggerIds.length > 0,
    notice: cycle?.state === "started",
    collect: cycle?.state === "started" && hasActivities,
    generate: !!report,
    validate: !!st && st !== "DRAFT",
    submit: !!st && POST_SUBMIT.includes(st),
    review: st === "APPROVED" || st === "ARCHIVED",
    complete: st === "ARCHIVED",
  };
  let currentFound = false;
  const steps = WORKFLOW_STEPS.map((s) => {
    if (done[s.key] && !currentFound) return { key: s.key, state: "done" as StepState };
    if (!currentFound) {
      currentFound = true;
      return { key: s.key, state: "current" as StepState };
    }
    return { key: s.key, state: "todo" as StepState };
  });

  let stage: PipelineStage | undefined;
  if (cycle) {
    if (st === "ARCHIVED") stage = "FINAL";
    else if (st && st !== "DRAFT") stage = "APPROVAL";
    else if (st === "DRAFT") stage = "VALIDATING";
    else if (cycle.state === "started") stage = "COLLECTING";
    else stage = "TRIGGERED";
  }
  const idx = stage ? PIPELINE_STAGES.indexOf(stage) : -1;
  const stages = PIPELINE_STAGES.map((key, i) => ({
    key,
    state: (stage === "FINAL" || i < idx ? "done" : i === idx ? "current" : "todo") as StepState,
  }));
  return { cycle, report, steps, stage, stages };
}

export interface DashboardView {
  journey: JourneyView;
  notification?: ReportingCycle;
  due: DueReport[];
  kpis: {
    documents: number;
    activities: number;
    projects: number;
    activitiesInPeriod: number | null;
    missingEvidence: number | null;
    reviewRequired: number | null;
  };
  recentTriggers: StoreData["triggers"];
  recentReports: Report[];
  userName: string;
}

export async function getDashboard(now = new Date()): Promise<DashboardView> {
  const d = await getStore().read();
  const cycle = activeCycle(d);
  const journey = journeyFor(d, cycle);
  const today = toIsoDate(now);
  const notification = d.cycles
    .filter((c) => c.state === "notified" || (c.state === "snoozed" && c.snoozeUntil && c.snoozeUntil <= today))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const live = d.activities.filter((a) => !a.duplicateOf);
  const report = journey.report;
  const summary = report ? validationSummary(report) : null;
  return {
    journey,
    notification,
    due: dueReports(now, d.settings),
    kpis: {
      documents: d.documents.length,
      activities: live.length,
      projects: new Set(live.map((a) => a.projectName.toLowerCase())).size,
      activitiesInPeriod: cycle ? live.filter((a) => inPeriod(a.activityDate, cycle.periodStart, cycle.periodEnd)).length : null,
      missingEvidence: report && report.status !== "ARCHIVED" ? detectMissingEvidence(report, d.activities, d.documents).length : null,
      reviewRequired: summary ? summary.reviewRequired + summary.noSource : null,
    },
    recentTriggers: [...d.triggers].reverse().slice(0, 5),
    recentReports: [...d.reports].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    userName: d.settings.userName,
  };
}

export async function getJourney(): Promise<JourneyView> {
  const d = await getStore().read();
  return journeyFor(d, activeCycle(d));
}
