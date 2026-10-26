import { handle, jsonBody } from "@/server/http";
import { createManualActivity, type ManualActivityInput } from "@/server/workflow/memoryService";

export async function POST(req: Request) {
  return handle(async () => createManualActivity(await jsonBody<ManualActivityInput>(req)));
}
