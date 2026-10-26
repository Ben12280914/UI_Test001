import { handle, jsonBody } from "@/server/http";
import { generateReport, type GenerateInput } from "@/server/workflow/reportService";

export const maxDuration = 300;

export async function POST(req: Request) {
  return handle(async () => {
    const body = await jsonBody<GenerateInput>(req);
    if (!["weekly", "monthly", "quarterly", "annual", "custom"].includes(body.type)) throw new Error("보고 유형이 올바르지 않습니다.");
    if (!["working", "team_leader", "executive"].includes(body.audience)) throw new Error("Audience가 올바르지 않습니다.");
    const report = await generateReport(body);
    return { id: report.id };
  });
}
