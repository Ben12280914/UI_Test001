import { readStoredFile } from "@/server/workflow/ingestService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { doc, buffer } = await readStoredFile((await params).id);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Not found", { status: 404 });
  }
}
