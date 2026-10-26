import { handle, jsonBody } from "@/server/http";
import { cycleAction } from "@/server/workflow/triggerService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const { action } = await jsonBody<{ action: "start" | "snooze" | "skip" }>(req);
    if (!["start", "snooze", "skip"].includes(action)) throw new Error("알 수 없는 동작입니다.");
    return cycleAction(id, action);
  });
}
