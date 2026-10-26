import { handle, jsonBody } from "@/server/http";
import { simulateReviewer, submitForApproval } from "@/server/workflow/approvalService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const { action, comment } = await jsonBody<{ action: string; comment?: string }>(req);
    if (action === "submit") return submitForApproval(id, comment);
    if (action === "open" || action === "request_changes" || action === "approve") return simulateReviewer(id, action, comment);
    throw new Error("알 수 없는 동작입니다.");
  });
}
