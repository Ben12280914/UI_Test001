import type { WorkActivity } from "@/domain/types";
import { handle, jsonBody } from "@/server/http";
import { deleteActivity, updateActivity } from "@/server/workflow/memoryService";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => updateActivity((await params).id, await jsonBody<Partial<WorkActivity>>(req)));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => deleteActivity((await params).id));
}
