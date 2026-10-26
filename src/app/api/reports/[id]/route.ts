import type { SectionKey } from "@/domain/types";
import { handle, jsonBody } from "@/server/http";
import * as reports from "@/server/workflow/reportService";

export const maxDuration = 300;

type Action =
  | { action: "updateItem"; itemId: string; text: string }
  | { action: "verify" | "unverify" | "deleteItem"; itemId: string }
  | { action: "verifyAll" | "markReady" }
  | { action: "addActivity" | "ignoreActivity"; activityId: string; sectionKey?: SectionKey }
  | { action: "propose"; comment: string }
  | { action: "resolveProposal"; proposalId: string; decision: "accept" | "reject" | "edit"; text?: string };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const body = await jsonBody<Action>(req);
    switch (body.action) {
      case "updateItem":
        return reports.updateItemText(id, body.itemId, body.text);
      case "verify":
        return reports.setItemVerified(id, body.itemId, true);
      case "unverify":
        return reports.setItemVerified(id, body.itemId, false);
      case "deleteItem":
        return reports.deleteItem(id, body.itemId);
      case "verifyAll":
        return reports.verifyAllSourceFound(id);
      case "markReady":
        return reports.markReadyForReview(id);
      case "addActivity":
        return reports.addActivityToReport(id, body.activityId, body.sectionKey);
      case "ignoreActivity":
        return reports.ignoreMissingActivity(id, body.activityId);
      case "propose":
        return reports.proposeFeedbackRevisions(id, body.comment);
      case "resolveProposal":
        return reports.resolveProposal(id, body.proposalId, body.decision, body.text);
      default:
        throw new Error("알 수 없는 동작입니다.");
    }
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => reports.deleteDraftReport((await params).id));
}
