import type { SourceType } from "@/domain/types";
import { firstDate } from "./dates";
import { parseExcel } from "./excel";
import { parsePdf } from "./pdf";
import { parsePptx } from "./pptx";
import { parseText } from "./text";
import type { ParsedDocument } from "./types";

export type { ParsedDocument, ParsedChunk, ParsedRow } from "./types";

export const SUPPORTED_EXTENSIONS = [".xlsx", ".pptx", ".pdf", ".txt", ".md", ".eml", ".csv"];

export function detectSourceType(fileName: string): SourceType | null {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  switch (ext) {
    case ".xlsx":
      return "excel";
    case ".pptx":
      return "ppt";
    case ".pdf":
      return "pdf";
    case ".eml":
      return "email";
    case ".txt":
    case ".md":
    case ".csv":
      return "text";
    default:
      return null;
  }
}

export async function parseDocument(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
  const type = detectSourceType(fileName);
  let parsed: ParsedDocument;
  switch (type) {
    case "excel":
      parsed = await parseExcel(buffer);
      break;
    case "ppt":
      parsed = await parsePptx(buffer);
      break;
    case "pdf":
      parsed = await parsePdf(buffer);
      break;
    case "email":
    case "text":
      parsed = parseText(buffer.toString("utf8"), fileName);
      break;
    default:
      throw new Error(`지원하지 않는 파일 형식입니다: ${fileName}`);
  }
  if (!parsed.documentDate) {
    // Fall back to a date in the file name (e.g. "Status_2026-10.xlsx" → none, "Mail_2026-10-14.txt" → 2026-10-14)
    // or the first date in the document text.
    parsed.documentDate =
      firstDate(fileName.replace(/_/g, " "), new Date().getFullYear()) ??
      firstDate(parsed.chunks.map((c) => c.text).join("\n"), new Date().getFullYear());
  }
  return parsed;
}
