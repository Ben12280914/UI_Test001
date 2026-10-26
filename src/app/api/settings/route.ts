import type { Settings } from "@/domain/types";
import { handle, jsonBody } from "@/server/http";
import { updateSettings } from "@/server/workflow/settingsService";

export async function PATCH(req: Request) {
  return handle(async () => updateSettings(await jsonBody<Partial<Settings>>(req)));
}
