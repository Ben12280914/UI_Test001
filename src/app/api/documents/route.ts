import { handle } from "@/server/http";
import { ingestFile } from "@/server/workflow/ingestService";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  return handle(async () => {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("업로드할 파일이 없습니다.");
    return ingestFile({ fileName: file.name, mimeType: file.type, buffer: Buffer.from(await file.arrayBuffer()) });
  });
}
