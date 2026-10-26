import type { ActivityStatus, Channel, WorkActivity } from "@/domain/types";
import { isValidIsoDate, toIsoDate } from "@/domain/period";
import { getEngine, type ManualActivityDraft } from "../ai";
import { newId, nowIso } from "../ids";
import { getStore } from "../store/jsonFileStore";
import { revalidateReportsCiting } from "./reportService";

export async function structureManualText(text: string): Promise<ManualActivityDraft & { engine: string }> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("업무 내용을 입력하세요.");
  if (trimmed.length > 2000) throw new Error("2,000자 이내로 입력하세요.");
  const { settings } = await getStore().read();
  const engine = getEngine();
  const draft = await engine.structureManualActivity(trimmed, settings.projects, toIsoDate(new Date()));
  return { ...draft, description: draft.description || trimmed, engine: engine.label };
}

export interface ManualActivityInput {
  activityDate: string;
  projectName: string;
  department?: string;
  activityType: string;
  description: string;
  channel: Channel;
  status: ActivityStatus;
  achievement?: string;
  issue?: string;
  risk?: string;
  nextAction?: string;
}

export async function createManualActivity(input: ManualActivityInput): Promise<WorkActivity> {
  if (!isValidIsoDate(input.activityDate)) throw new Error("날짜를 YYYY-MM-DD 형식으로 입력하세요.");
  if (!input.projectName.trim() || !input.description.trim()) throw new Error("프로젝트와 업무 내용은 필수입니다.");
  return getStore().update((d) => {
    const now = nowIso();
    const activity: WorkActivity = {
      id: newId("act"),
      activityDate: input.activityDate,
      projectName: input.projectName.trim(),
      department: input.department?.trim() || d.settings.department,
      activityType: input.activityType.trim() || "업무 수행",
      description: input.description.trim(),
      achievement: input.achievement?.trim() || undefined,
      issue: input.issue?.trim() || undefined,
      risk: input.risk?.trim() || undefined,
      nextAction: input.nextAction?.trim() || undefined,
      status: input.status,
      channel: input.channel,
      kpis: [],
      sourceType: "manual",
      sourceRefs: [],
      confidence: 1,
      extractedBy: "user",
      flags: ["수기 입력 — 근거 문서 없음"],
      createdAt: now,
      updatedAt: now,
    };
    d.activities.push(activity);
    if (!d.settings.projects.some((p) => p.toLowerCase() === activity.projectName.toLowerCase())) d.settings.projects.push(activity.projectName);
    return activity;
  });
}

const EDITABLE: (keyof WorkActivity)[] = [
  "activityDate",
  "projectName",
  "department",
  "activityType",
  "description",
  "achievement",
  "issue",
  "risk",
  "nextAction",
  "status",
  "channel",
];

export async function updateActivity(id: string, patch: Partial<WorkActivity>): Promise<WorkActivity> {
  if (patch.activityDate !== undefined && !isValidIsoDate(patch.activityDate)) throw new Error("날짜 형식이 올바르지 않습니다.");
  const updated = await getStore().update((d) => {
    const a = d.activities.find((x) => x.id === id);
    if (!a) throw new Error("Activity를 찾을 수 없습니다.");
    for (const key of EDITABLE) {
      if (key in patch) (a as unknown as Record<string, unknown>)[key] = patch[key] === "" ? undefined : patch[key];
    }
    if (!a.flags.includes("사용자 수정")) a.flags.push("사용자 수정");
    a.updatedAt = nowIso();
    return a;
  });
  await revalidateReportsCiting([id]);
  return updated;
}

export async function deleteActivity(id: string): Promise<void> {
  await getStore().update((d) => {
    const lockedReport = d.reports.find(
      (r) => r.status !== "DRAFT" && r.sections.some((s) => s.items.some((i) => i.activityIds.includes(id))),
    );
    if (lockedReport) throw new Error(`'${lockedReport.title}' 보고서의 근거로 사용 중이라 삭제할 수 없습니다.`);
    d.activities = d.activities.filter((a) => a.id !== id);
    for (const a of d.activities) if (a.duplicateOf === id) a.duplicateOf = undefined;
  });
  await revalidateReportsCiting([id]);
}
