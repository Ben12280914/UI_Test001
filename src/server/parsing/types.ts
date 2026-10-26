import type { SourceType } from "@/domain/types";

export interface ParsedChunk {
  locator: string;
  text: string;
}

/** A spreadsheet row with its header-mapped values, kept so tabular data can be mapped without an LLM. */
export interface ParsedRow {
  chunkIndex: number;
  sheet: string;
  rowNumber: number;
  values: Record<string, string>;
}

export interface ParsedDocument {
  sourceType: SourceType;
  chunks: ParsedChunk[];
  rows: ParsedRow[];
  documentDate?: string;
  meta: Record<string, string>;
}
