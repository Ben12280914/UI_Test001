import { handle, jsonBody } from "@/server/http";
import { seedDemoData } from "@/server/workflow/demoSeed";
import { resetAllData } from "@/server/workflow/settingsService";

export async function POST(req: Request) {
  return handle(async () => {
    const { mode } = await jsonBody<{ mode: "seed" | "empty" }>(req);
    if (mode === "seed") return seedDemoData();
    if (mode === "empty") return resetAllData();
    throw new Error("알 수 없는 초기화 방식입니다.");
  });
}
