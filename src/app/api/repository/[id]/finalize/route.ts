import { handle } from "@/server/http";
import { finalizeAndArchive } from "@/server/workflow/repositoryService";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { report, external } = await finalizeAndArchive((await params).id);
    return { id: report.id, path: report.archive?.path, external };
  });
}
