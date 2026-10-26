import type { ParsedChunk, ParsedDocument } from "./types";

export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const chunks: ParsedChunk[] = [];
  text.forEach((pageText, i) => {
    const cleaned = pageText.replace(/[ \t]+\n/g, "\n").trim();
    if (cleaned) chunks.push({ locator: `Page ${i + 1}`, text: cleaned });
  });
  return { sourceType: "pdf", chunks, rows: [], meta: { pages: String(totalPages) } };
}
