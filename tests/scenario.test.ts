/**
 * End-to-end demo scenario on the deterministic engine (no network).
 * Runs against a temporary DATA_DIR.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "ezi-test-"));
process.env.AI_MODE = "demo";

const sample = (n: string) => readFileSync(path.resolve("samples", n));

test("8-step reporting journey runs end to end", async () => {
  const { seedDemoData } = await import("../src/server/workflow/demoSeed");
  const { receiveTrigger, cycleAction } = await import("../src/server/workflow/triggerService");
  const { adapters } = await import("../src/server/adapters");
  const { ingestFile } = await import("../src/server/workflow/ingestService");
  const memory = await import("../src/server/workflow/memoryService");
  const reports = await import("../src/server/workflow/reportService");
  const approval = await import("../src/server/workflow/approvalService");
  const repo = await import("../src/server/workflow/repositoryService");
  const { getStore } = await import("../src/server/store/jsonFileStore");

  await seedDemoData();

  // 01–02 Trigger + notification
  const { cycles } = await receiveTrigger(adapters.demoTrigger, { type: "GPS_ARRIVAL" }, new Date(2026, 9, 26));
  const cycle = cycles.find((c) => c.reportType === "monthly");
  assert.ok(cycle, "monthly cycle raised");
  assert.equal(cycle.periodStart, "2026-10-01");
  await cycleAction(cycle.id, "start");

  // 03 Collect
  for (const f of ["OPEX_Project_Status_2026-10.xlsx", "AI_CFT_Result.pptx", "Nesting_ML_Review_2026-10.pdf", "Email_Smart_Monitoring_2026-10-23.txt"]) {
    const r = await ingestFile({ fileName: f, mimeType: "", buffer: sample(f) });
    assert.equal(r.error, undefined, `${f}: ${r.error}`);
    assert.ok(r.activityCount > 0, `${f} produced activities`);
  }
  const data = await getStore().read();
  const oct = data.activities.filter((a) => a.activityDate.startsWith("2026-10"));
  assert.ok(oct.length >= 7, `october activities: ${oct.length}`);
  for (const a of oct) assert.ok(a.sourceRefs.length > 0, "every extracted activity has a source");

  // 04 Generate
  const report = await reports.generateReport({ type: "monthly", periodStart: "2026-10-01", periodEnd: "2026-10-31", audience: "team_leader", cycleId: cycle.id });
  const view = await reports.getReportView(report.id);
  assert.ok(view.summary.total > 0);
  assert.ok(view.previous, "september report found for comparison");
  const kinds = new Set(view.changes.map((c) => c.kind));
  assert.ok(kinds.has("NEW") && kinds.has("COMPLETED") && kinds.has("DELAYED_RISK"), `changes: ${[...kinds]}`);

  // 09 Missing activity (phone call) → missing evidence → add to report
  const draft = await memory.structureManualText("10월 20일 금형팀과 CAPA 관련해서 전화로 협의했고, 다음 주에 요구사항을 다시 정리하기로 했다.");
  assert.equal(draft.activityDate, "2026-10-20");
  assert.equal(draft.channel, "phone");
  const manual = await memory.createManualActivity({ ...draft, activityDate: draft.activityDate!, department: draft.department ?? undefined, achievement: undefined, issue: undefined, risk: undefined, nextAction: draft.nextAction ?? undefined });
  const v2 = await reports.getReportView(report.id);
  assert.ok(v2.missing.some((m) => m.activity.id === manual.id), "manual activity detected as missing");
  await reports.addActivityToReport(report.id, manual.id);

  // 05 Validate: manual-only item needs a human check, then everything is verified
  let v3 = await reports.getReportView(report.id);
  const manualItem = v3.report.sections.flatMap((s) => s.items).find((i) => i.activityIds.includes(manual.id))!;
  assert.equal(manualItem.validation.status, "REVIEW_REQUIRED");
  await assert.rejects(reports.markReadyForReview(report.id));
  for (const item of v3.report.sections.flatMap((s) => s.items)) {
    if (item.validation.status === "REVIEW_REQUIRED" || item.validation.status === "SOURCE_FOUND") await reports.setItemVerified(report.id, item.id, true);
  }
  v3 = await reports.getReportView(report.id);
  assert.equal(v3.summary.noSource + v3.summary.reviewRequired, 0, JSON.stringify(v3.summary));
  await reports.markReadyForReview(report.id);

  // AI may not finalize without approval
  await assert.rejects(repo.finalizeAndArchive(report.id));

  // 06–07 Submit, manager comment, AI proposal, accept
  await approval.submitForApproval(report.id);
  await approval.simulateReviewer(report.id, "open");
  await approval.simulateReviewer(report.id, "request_changes", "AI CFT 부분은 결과보다 현업 적용 계획을 조금 더 강조해주세요.");
  const proposals = await reports.proposeFeedbackRevisions(report.id, "AI CFT 부분은 결과보다 현업 적용 계획을 조금 더 강조해주세요.");
  assert.ok(proposals.length > 0, "AI proposes revisions");
  for (const p of proposals) {
    assert.match(p.suggested, /현업 적용/);
    await reports.resolveProposal(report.id, p.id, "accept");
  }
  const v4 = await reports.getReportView(report.id);
  for (const item of v4.report.sections.flatMap((s) => s.items)) {
    if (item.validation.status !== "VERIFIED") await reports.setItemVerified(report.id, item.id, true);
  }
  await approval.submitForApproval(report.id);
  await approval.simulateReviewer(report.id, "approve", "수고했습니다.");

  // 08 Final + repository
  const { report: final } = await repo.finalizeAndArchive(report.id);
  assert.equal(final.status, "ARCHIVED");
  assert.deepEqual(final.versions.map((v) => v.version), ["0.1", "0.2", "0.3", "1.0"]);
  assert.match(final.archive!.path, /^2026\/Monthly\//);
  const found = await repo.searchRepository({ year: "2026", type: "monthly" });
  assert.equal(found.reports.length, 2);
});
