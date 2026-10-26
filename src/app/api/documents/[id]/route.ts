import { handle } from "@/server/http";
import { deleteDocument } from "@/server/workflow/ingestService";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => deleteDocument((await params).id));
}
