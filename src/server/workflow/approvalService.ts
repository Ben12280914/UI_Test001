import type { Report, StoreData } from "@/domain/types";
import { adapters } from "../adapters";
import { nowIso } from "../ids";
import { getStore } from "../store/jsonFileStore";
import { snapshotVersion, validationSummary } from "./reportService";

function findReport(d: StoreData, id: string): Report {
  const r = d.reports.find((x) => x.id === id);
  if (!r) throw new Error("보고서를 찾을 수 없습니다.");
  return r;
}

/** [메모결재 상신] — first submission from READY_FOR_REVIEW, resubmission after CHANGES_REQUESTED. */
export async function submitForApproval(reportId: string, note?: string) {
  const store = getStore();
  const d = await store.read();
  const report = findReport(d, reportId);
  const resubmit = report.status === "CHANGES_REQUESTED";
  if (report.status !== "READY_FOR_REVIEW" && !resubmit) {
    throw new Error("검토 완료(READY FOR REVIEW) 또는 수정 요청(CHANGES REQUESTED) 상태에서만 상신할 수 있습니다.");
  }
  const s = validationSummary(report);
  if (s.noSource || s.reviewRequired) throw new Error("Source 검증이 끝나지 않은 항목이 있습니다. Validation을 먼저 완료하세요.");
  if (report.proposals.some((p) => p.status === "pending")) throw new Error("처리하지 않은 AI 수정 제안이 있습니다. Accept / Reject / Edit 후 상신하세요.");

  const round = (report.approval?.round ?? 0) + 1;
  const { externalRef } = await adapters.approval.submit({
    report,
    submitter: d.settings.userName,
    reviewer: d.settings.reviewerName,
    round,
  });

  return store.update((dd) => {
    const r = findReport(dd, reportId);
    const comments = r.approval?.comments ?? [];
    if (note?.trim()) comments.push({ author: dd.settings.userName, role: "submitter", text: note.trim(), at: nowIso() });
    r.approval = {
      externalRef,
      adapter: adapters.approval.name,
      submitter: dd.settings.userName,
      reviewer: dd.settings.reviewerName,
      submittedAt: nowIso(),
      status: "SUBMITTED",
      comments,
      round,
    };
    if (resubmit) snapshotVersion(r, "Manager Feedback Applied", dd.settings.userName);
    r.status = "SUBMITTED";
    r.updatedAt = nowIso();
    return r;
  });
}

/**
 * Reviewer actions. Only available with the mock adapter — with a real 메모결재 system,
 * status changes would arrive from that system instead.
 */
export async function simulateReviewer(reportId: string, action: "open" | "request_changes" | "approve", comment?: string) {
  if (!adapters.approval.isMock) throw new Error("실제 결재 시스템이 연결되어 있어 시뮬레이션을 사용할 수 없습니다.");
  return getStore().update((d) => {
    const r = findReport(d, reportId);
    if (!r.approval) throw new Error("상신되지 않은 보고서입니다.");
    const now = nowIso();
    if (action === "open") {
      if (r.status !== "SUBMITTED") throw new Error("상신(SUBMITTED) 상태에서만 열람할 수 있습니다.");
      r.status = "IN_REVIEW";
      r.approval.status = "IN_REVIEW";
    } else {
      if (r.status !== "IN_REVIEW" && r.status !== "SUBMITTED") throw new Error("검토 중인 보고서가 아닙니다.");
      if (action === "request_changes" && !comment?.trim()) throw new Error("수정 요청 Comment를 입력하세요.");
      if (comment?.trim()) r.approval.comments.push({ author: d.settings.reviewerName, role: "reviewer", text: comment.trim(), at: now });
      r.status = action === "approve" ? "APPROVED" : "CHANGES_REQUESTED";
      r.approval.status = r.status;
    }
    r.updatedAt = now;
    return r;
  });
}
