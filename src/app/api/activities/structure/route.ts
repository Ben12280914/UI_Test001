import { handle, jsonBody } from "@/server/http";
import { structureManualText } from "@/server/workflow/memoryService";

export async function POST(req: Request) {
  return handle(async () => structureManualText(String((await jsonBody(req)).text ?? "")));
}
