import type {
  Audience,
  FeedbackProposal,
  Report,
  ReportItem,
  ReportSection,
  ReportType,
  SectionKey,
  StoreData,
} from "@/domain/types";
import { REPORT_TYPE_LABELS, SECTION_ORDER, SECTION_TITLES } from "@/domain/constants";
import { inPeriod, isValidIsoDate, periodLabel } from "@/domain/period";
import { getEngine } from "../ai";
import { sanitizeDraft, sanitizeProposals } from "../ai/guardrails";
import { newId, nowIso } from "../ids";
import { getStore } from "../store/jsonFileStore";
import { compareSnapshots, findPreviousReport, snapshotProjects, type ProjectChange } from "../validation/comparator";
import { detectMissingEvidence, type MissingCandidate } from "../validation/missingEvidence";
import { buildEvidenceContext, validateItem } from "../validation/validator";

// ── helpers ─────────────────────────────────────────────────────────────────

function findReport(d: StoreData, id: string): Report {
  const r = d.reports.find((x) => x.id === id);
  if (!r) throw new Error("보고서를 찾을 수 없습니다.");
  return r;
}

function findItem(report: Report, itemId: string): { section: ReportSection; item: ReportItem } {
  for (const section of report.sections) {
    const item = section.items.find((i) => i.id === itemId);
    if (item) return { section, item };
  }
  throw new Error("보고서 항목을 찾을 수 없습니다.");
}

/** Content may only change while the author owns the draft (before submission, or after changes were requested). */
function assertEditable(report: Report) {
  if (!["DRAFT", "READY_FOR_REVIEW", "CHANGES_REQUESTED"].includes(report.status)) {
    throw new Error("결재가 진행 중이거나 완료된 보고서는 수정할 수 없습니다.");
  }
}

function revalidate(d: StoreData, report: Report) {
  const ctx = buildEvidenceContext(d.activities, d.chunks);
  for (const s of report.sections) for (const i of s.items) i.validation = validateItem(i, ctx);
  report.updatedAt = nowIso();
}

/** Any content change after "Ready for review" sends the report back to DRAFT so validation is redone. */
function touched(report: Report) {
  if (report.status === "READY_FOR_REVIEW") report.status = "DRAFT";
}

export function nextVersion(report: Report): string {
  const last = report.versions[report.versions.length - 1];
  if (!last) return "0.1";
  const [major, minor] = last.version.split(".").map(Number);
  return `${major}.${minor + 1}`;
}

export function snapshotVersion(report: Report, label: string, author: string, version = nextVersion(report)) {
  report.versions.push({ version, label, createdAt: nowIso(), author, sections: structuredClone(report.sections) });
}

export function validationSummary(report: Report) {
  const items = report.sections.flatMap((s) => s.items);
  const count = (st: string) => items.filter((i) => i.validation.status === st).length;
  return {
    total: items.length,
    verified: count("VERIFIED"),
    sourceFound: count("SOURCE_FOUND"),
    reviewRequired: count("REVIEW_REQUIRED"),
    noSource: count("NO_SOURCE"),
  };
}

export function reportTitle(type: ReportType, periodStart: string, periodEnd: string, department: string): string {
  const label = periodLabel(type, { start: periodStart, end: periodEnd });
  return `${label.replace(/ (Monthly|Weekly|Annual)$/, "")} ${department} ${REPORT_TYPE_LABELS[type]} Report`.replace(/\s+/g, " ");
}

// ── generation ──────────────────────────────────────────────────────────────

export interface GenerateInput {
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  audience: Audience;
  cycleId?: string;
}

export async function generateReport(input: GenerateInput): Promise<Report> {
  if (!isValidIsoDate(input.periodStart) || !isValidIsoDate(input.periodEnd) || input.periodStart > input.periodEnd) {
    throw new Error("보고 기간이 올바르지 않습니다.");
  }
  const store = getStore();
  const data = await store.read();
  const activities = data.activities.filter((a) => !a.duplicateOf && inPeriod(a.activityDate, input.periodStart, input.periodEnd));
  if (activities.length === 0) {
    throw new Error("선택한 기간에 Work Memory가 없습니다. Data Space에 자료를 올리거나 업무를 추가하세요.");
  }

  const engine = getEngine();
  const drafted = sanitizeDraft(
    await engine.draftReport({ ...input, activities, department: data.settings.department }),
    new Set(activities.map((a) => a.id)),
  );

  return store.update((d) => {
    const now = nowIso();
    const ctx = buildEvidenceContext(d.activities, d.chunks);
    const sections: ReportSection[] = SECTION_ORDER.map((key) => ({
      key,
      title: SECTION_TITLES[key],
      items: drafted
        .filter((i) => i.sectionKey === key)
        .map((i) => {
          const item: ReportItem = {
            id: newId("itm"),
            text: i.text,
            projectName: i.projectName ?? undefined,
            activityIds: i.activityIds,
            origin: "ai",
            validation: { status: "NO_SOURCE", reasons: [], checkedAt: now },
          };
          item.validation = validateItem(item, ctx);
          return item;
        }),
    }));
    const report: Report = {
      id: newId("rpt"),
      title: reportTitle(input.type, input.periodStart, input.periodEnd, d.settings.department),
      type: input.type,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      audience: input.audience,
      status: "DRAFT",
      sections,
      projectSnapshots: snapshotProjects(activities),
      versions: [],
      proposals: [],
      ignoredActivityIds: [],
      generatedBy: engine.kind === "live" ? "ai" : "rule",
      cycleId: input.cycleId,
      author: d.settings.userName,
      department: d.settings.department,
      createdAt: now,
      updatedAt: now,
    };
    snapshotVersion(report, "AI Draft", engine.label, "0.1");
    d.reports.push(report);
    if (input.cycleId) {
      const cycle = d.cycles.find((c) => c.id === input.cycleId);
      if (cycle) {
        cycle.reportId = report.id;
        cycle.state = "started";
        cycle.updatedAt = now;
      }
    }
    return report;
  });
}

// ── view model ──────────────────────────────────────────────────────────────

export interface ReportView {
  report: Report;
  summary: ReturnType<typeof validationSummary>;
  previous?: Pick<Report, "id" | "title" | "periodStart" | "periodEnd">;
  changes: ProjectChange[];
  missing: MissingCandidate[];
}

export async function getReportView(id: string): Promise<ReportView> {
  const d = await getStore().read();
  const report = findReport(d, id);
  const previous = findPreviousReport(report, d.reports);
  return {
    report,
    summary: validationSummary(report),
    previous: previous && { id: previous.id, title: previous.title, periodStart: previous.periodStart, periodEnd: previous.periodEnd },
    changes: previous ? compareSnapshots(report.projectSnapshots, previous.projectSnapshots) : [],
    missing: ["DRAFT", "READY_FOR_REVIEW", "CHANGES_REQUESTED"].includes(report.status) ? detectMissingEvidence(report, d.activities, d.documents) : [],
  };
}

// ── item editing / validation actions ──────────────────────────────────────

export async function updateItemText(reportId: string, itemId: string, text: string) {
  if (!text.trim()) throw new Error("내용을 입력하세요.");
  return getStore().update((d) => {
    const report = findReport(d, reportId);
    assertEditable(report);
    const { item } = findItem(report, itemId);
    if (item.text !== text.trim()) {
      item.text = text.trim();
      item.verifiedAt = undefined;
      item.verifiedBy = undefined;
      touched(report);
    }
    revalidate(d, report);
  });
}

export async function setItemVerified(reportId: string, itemId: string, verified: boolean) {
  return getStore().update((d) => {
    const report = findReport(d, reportId);
    assertEditable(report);
    const { item } = findItem(report, itemId);
    if (verified) {
      const current = validateItem({ ...item, verifiedAt: undefined }, buildEvidenceContext(d.activities, d.chunks));
      if (current.status === "NO_SOURCE") throw new Error("Source가 없는 항목은 Verified 처리할 수 없습니다. 근거를 연결하거나 삭제하세요.");
      if (current.reasons.some((r) => r.startsWith("수치"))) {
        throw new Error("Source에서 확인되지 않는 수치가 있습니다. 문장을 수정한 뒤 확인하세요.");
      }
      item.verifiedAt = nowIso();
      item.verifiedBy = d.settings.userName;
    } else {
      item.verifiedAt = undefined;
      item.verifiedBy = undefined;
      touched(report);
    }
    revalidate(d, report);
  });
}

/** Verify every item whose source was found (bulk action after the user has reviewed the evidence). */
export async function verifyAllSourceFound(reportId: string) {
  return getStore().update((d) => {
    const report = findReport(d, reportId);
    assertEditable(report);
    for (const s of report.sections)
      for (const i of s.items)
        if (i.validation.status === "SOURCE_FOUND") {
          i.verifiedAt = nowIso();
          i.verifiedBy = d.settings.userName;
        }
    revalidate(d, report);
  });
}

export async function deleteItem(reportId: string, itemId: string) {
  return getStore().update((d) => {
    const report = findReport(d, reportId);
    assertEditable(report);
    for (const s of report.sections) s.items = s.items.filter((i) => i.id !== itemId);
    touched(report);
    revalidate(d, report);
  });
}

function sentenceFor(a: StoreData["activities"][number]): string {
  const body = a.achievement ?? a.description;
  const next = a.nextAction ? ` (다음: ${a.nextAction})` : "";
  return `[${a.projectName}] ${body}${next}`.replace(/\s+/g, " ").trim();
}

/** "Add to Report" from Missing Evidence: adds a sourced item to Project Progress. */
export async function addActivityToReport(reportId: string, activityId: string, sectionKey: SectionKey = "project_progress") {
  return getStore().update((d) => {
    const report = findReport(d, reportId);
    assertEditable(report);
    const a = d.activities.find((x) => x.id === activityId);
    if (!a) throw new Error("Activity를 찾을 수 없습니다.");
    const section = report.sections.find((s) => s.key === sectionKey)!;
    section.items.push({
      id: newId("itm"),
      text: sentenceFor(a),
      projectName: a.projectName,
      activityIds: [a.id],
      origin: "missing_evidence",
      validation: { status: "NO_SOURCE", reasons: [], checkedAt: nowIso() },
    });
    const others = report.projectSnapshots.filter((p) => p.projectName !== a.projectName);
    const cited = new Set(report.sections.flatMap((s) => s.items.flatMap((i) => i.activityIds)));
    report.projectSnapshots = [...others, ...snapshotProjects(d.activities.filter((x) => cited.has(x.id) && x.projectName === a.projectName))];
    touched(report);
    revalidate(d, report);
  });
}

export async function ignoreMissingActivity(reportId: string, activityId: string) {
  return getStore().update((d) => {
    const report = findReport(d, reportId);
    if (!report.ignoredActivityIds.includes(activityId)) report.ignoredActivityIds.push(activityId);
    report.updatedAt = nowIso();
  });
}

/** Step 05 완료: every item must have a source and be checked. */
export async function markReadyForReview(reportId: string) {
  return getStore().update((d) => {
    const report = findReport(d, reportId);
    if (report.status !== "DRAFT") throw new Error("초안(DRAFT) 상태에서만 검토 완료 처리할 수 있습니다.");
    revalidate(d, report);
    const s = validationSummary(report);
    if (s.total === 0) throw new Error("보고서에 항목이 없습니다.");
    if (s.noSource || s.reviewRequired) {
      throw new Error(`검토가 필요한 항목이 남아 있습니다 (No Source ${s.noSource}건, Review Required ${s.reviewRequired}건).`);
    }
    report.status = "READY_FOR_REVIEW";
    if (!report.versions.some((v) => v.label === "User Reviewed")) snapshotVersion(report, "User Reviewed", d.settings.userName);
  });
}

// ── manager feedback → AI revision proposals ───────────────────────────────

export async function proposeFeedbackRevisions(reportId: string, comment: string): Promise<FeedbackProposal[]> {
  const text = comment.trim();
  if (!text) throw new Error("반영할 Comment가 없습니다.");
  const store = getStore();
  const d = await store.read();
  const report = findReport(d, reportId);
  if (report.status !== "CHANGES_REQUESTED") throw new Error("팀장이 수정 요청한 보고서에만 피드백을 반영할 수 있습니다.");
  const targets = report.sections.flatMap((s) =>
    s.items.map((i) => ({ itemId: i.id, sectionKey: s.key, text: i.text, projectName: i.projectName, activityIds: i.activityIds })),
  );
  const activities = d.activities.filter((a) => !a.duplicateOf && inPeriod(a.activityDate, report.periodStart, report.periodEnd));
  const engine = getEngine();
  const drafts = sanitizeProposals(
    await engine.proposeRevisions({ comment: text, items: targets, activities }),
    targets,
    new Set(activities.map((a) => a.id)),
  );

  return store.update((dd) => {
    const r = findReport(dd, reportId);
    // Pending proposals from an earlier run of the same comment are replaced.
    r.proposals = r.proposals.filter((p) => p.status !== "pending");
    const created: FeedbackProposal[] = drafts.map((p) => {
      const { section, item } = findItem(r, p.itemId);
      return {
        id: newId("prp"),
        commentText: text,
        itemId: p.itemId,
        sectionKey: section.key,
        original: item.text,
        suggested: p.suggested.trim(),
        rationale: p.rationale,
        activityIds: p.activityIds.length ? p.activityIds : item.activityIds,
        status: "pending",
        createdAt: nowIso(),
      };
    });
    r.proposals.push(...created);
    r.updatedAt = nowIso();
    return created;
  });
}

export async function resolveProposal(reportId: string, proposalId: string, action: "accept" | "reject" | "edit", editedText?: string) {
  return getStore().update((d) => {
    const report = findReport(d, reportId);
    assertEditable(report);
    const p = report.proposals.find((x) => x.id === proposalId);
    if (!p) throw new Error("수정 제안을 찾을 수 없습니다.");
    if (p.status !== "pending") throw new Error("이미 처리된 제안입니다.");
    if (action === "reject") {
      p.status = "rejected";
    } else {
      const finalText = action === "edit" ? (editedText ?? "").trim() : p.suggested;
      if (!finalText) throw new Error("수정할 내용을 입력하세요.");
      const { item } = findItem(report, p.itemId);
      item.text = finalText;
      item.activityIds = [...new Set([...item.activityIds, ...p.activityIds])];
      item.origin = "feedback";
      item.verifiedAt = undefined;
      item.verifiedBy = undefined;
      p.status = action === "edit" ? "edited" : "accepted";
      p.finalText = finalText;
    }
    revalidate(d, report);
  });
}

/** Keeps DRAFT/CHANGES_REQUESTED reports in sync when the Work Memory they cite changes. */
export async function revalidateReportsCiting(activityIds: string[]) {
  const ids = new Set(activityIds);
  await getStore().update((d) => {
    for (const r of d.reports) {
      if (!["DRAFT", "READY_FOR_REVIEW", "CHANGES_REQUESTED"].includes(r.status)) continue;
      if (!r.sections.some((s) => s.items.some((i) => i.activityIds.some((id) => ids.has(id))))) continue;
      touched(r);
      revalidate(d, r);
    }
  });
}

export async function deleteDraftReport(reportId: string) {
  return getStore().update((d) => {
    const report = findReport(d, reportId);
    if (report.status !== "DRAFT") throw new Error("초안(DRAFT)만 삭제할 수 있습니다.");
    d.reports = d.reports.filter((r) => r.id !== reportId);
    for (const c of d.cycles) if (c.reportId === reportId) c.reportId = undefined;
  });
}
