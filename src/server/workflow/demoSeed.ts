import { promises as fs } from "node:fs";
import path from "node:path";
import { withRuleEngine } from "../ai";
import { simulateReviewer, submitForApproval } from "./approvalService";
import { ingestFile } from "./ingestService";
import { finalizeAndArchive } from "./repositoryService";
import { generateReport, markReadyForReview, verifyAllSourceFound } from "./reportService";
import { resetAllData } from "./settingsService";

const SAMPLES_DIR = path.resolve("samples");

/**
 * Demo baseline: wipe data, then run the September monthly report through the real pipeline
 * (ingest → draft → validate → approve → archive) so October can be compared against it.
 * Uses the rule engine so seeding never calls the external API.
 */
export async function seedDemoData(): Promise<{ septemberReportId: string }> {
  await resetAllData();
  return withRuleEngine(async () => {
    const file = "OPEX_Project_Status_2026-09.xlsx";
    const buffer = await fs.readFile(path.join(SAMPLES_DIR, file));
    const res = await ingestFile({ fileName: file, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer });
    if (res.error) throw new Error(res.error);
    const report = await generateReport({ type: "monthly", periodStart: "2026-09-01", periodEnd: "2026-09-30", audience: "team_leader" });
    await verifyAllSourceFound(report.id);
    await markReadyForReview(report.id);
    await submitForApproval(report.id, "9월 월간보고 상신드립니다.");
    await simulateReviewer(report.id, "open");
    await simulateReviewer(report.id, "approve", "확인했습니다.");
    await finalizeAndArchive(report.id);
    return { septemberReportId: report.id };
  });
}

export async function listSampleFiles(): Promise<{ name: string; size: number }[]> {
  try {
    const names = await fs.readdir(SAMPLES_DIR);
    const out = [];
    for (const name of names.sort()) {
      if (name.startsWith(".")) continue;
      const st = await fs.stat(path.join(SAMPLES_DIR, name));
      if (st.isFile()) out.push({ name, size: st.size });
    }
    return out;
  } catch {
    return [];
  }
}

export async function readSampleFile(name: string): Promise<Buffer> {
  const resolved = path.resolve(SAMPLES_DIR, path.basename(name));
  return fs.readFile(resolved);
}
