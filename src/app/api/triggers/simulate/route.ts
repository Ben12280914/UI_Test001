import { adapters, TriggerPayloadSchema } from "@/server/adapters";
import { handle, jsonBody } from "@/server/http";
import { receiveTrigger } from "@/server/workflow/triggerService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const parsed = TriggerPayloadSchema.parse(await jsonBody(req));
    return receiveTrigger(adapters.demoTrigger, parsed);
  });
}
