import type { Report } from "@/domain/types";
import { newId } from "../ids";

export interface ApprovalSubmission {
  report: Pick<Report, "id" | "title" | "periodStart" | "periodEnd">;
  submitter: string;
  reviewer: string;
  round: number;
}

/**
 * 사내 메모결재 연동 지점. The real API is unknown, so the MVP uses a mock that issues a reference id;
 * the reviewer's actions are simulated from the Approval screen.
 */
export interface ApprovalAdapter {
  readonly name: string;
  readonly isMock: boolean;
  submit(submission: ApprovalSubmission): Promise<{ externalRef: string }>;
}

export class MockApprovalAdapter implements ApprovalAdapter {
  readonly name = "Mock 메모결재";
  readonly isMock = true;
  async submit(submission: ApprovalSubmission) {
    return { externalRef: `MEMO-${submission.report.periodStart.slice(0, 7)}-${newId("r").slice(2, 8).toUpperCase()}` };
  }
}
