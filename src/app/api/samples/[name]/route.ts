import { handle } from "@/server/http";
import { listSampleFiles, readSampleFile } from "@/server/workflow/demoSeed";
import { ingestFile } from "@/server/workflow/ingestService";

export const maxDuration = 300;

/** Loads one of the bundled synthetic sample files into the Data Space (demo convenience). */
export async function POST(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  return handle(async () => {
    const name = decodeURIComponent((await params).name);
    if (!(await listSampleFiles()).some((f) => f.name === name)) throw new Error("샘플 파일을 찾을 수 없습니다.");
    return ingestFile({ fileName: name, mimeType: "", buffer: await readSampleFile(name) });
  });
}
