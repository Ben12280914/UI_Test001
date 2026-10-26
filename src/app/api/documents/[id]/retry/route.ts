import { handle } from "@/server/http";
import { retryExtraction } from "@/server/workflow/ingestService";

export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => retryExtraction((await params).id));
}
