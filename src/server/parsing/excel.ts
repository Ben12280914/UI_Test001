import ExcelJS from "exceljs";
import { dateFromCell } from "./dates";
import type { ParsedChunk, ParsedDocument, ParsedRow } from "./types";

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return dateFromCell(value) ?? value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("text" in value) return String(value.text);
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("error" in value) return "";
  }
  return String(value).trim();
}

export async function parseExcel(buffer: Buffer): Promise<ParsedDocument> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const chunks: ParsedChunk[] = [];
  const rows: ParsedRow[] = [];

  wb.eachSheet((sheet) => {
    let header: string[] | null = null;
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cells[col - 1] = cellText(cell.value);
      });
      if (cells.every((c) => !c)) return;
      if (!header) {
        header = cells.map((c, i) => c || `Column ${i + 1}`);
        return;
      }
      const values: Record<string, string> = {};
      header.forEach((h, i) => {
        const v = cells[i] ?? "";
        if (v) values[h] = v;
      });
      if (Object.keys(values).length === 0) return;
      const text = Object.entries(values)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
      rows.push({ chunkIndex: chunks.length, sheet: sheet.name, rowNumber, values });
      chunks.push({ locator: `Sheet '${sheet.name}' · Row ${rowNumber}`, text });
    });
  });

  return { sourceType: "excel", chunks, rows, meta: { sheets: String(wb.worksheets.length) } };
}
