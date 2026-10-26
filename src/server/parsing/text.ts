import { firstDate } from "./dates";
import type { ParsedChunk, ParsedDocument } from "./types";

const MAX_CHUNK = 900;

function paragraphs(body: string): string[] {
  const parts = body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  // Merge very short paragraphs so a chunk carries enough context, but keep chunks small for precise citation.
  const merged: string[] = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (last !== undefined && last.length < 120 && last.length + p.length < MAX_CHUNK) merged[merged.length - 1] = `${last}\n${p}`;
    else merged.push(p);
  }
  return merged;
}

const HEADER_RE = /^(From|To|Cc|Date|Subject|보낸 사람|받는 사람|날짜|제목)\s*:\s*(.*)$/i;

/** Detect "From:/To:/Subject:" style headers at the top of an email export. */
function splitEmail(raw: string): { headers: Record<string, string>; body: string } | null {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const headers: Record<string, string> = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) break;
    const m = line.match(HEADER_RE);
    if (m) headers[m[1].toLowerCase()] = m[2].trim();
    else if (/^\s/.test(line) && Object.keys(headers).length) continue; // folded header
    else if (/^[\w-]+:\s/.test(line)) continue; // other MIME headers
    else return null;
  }
  const hasEmailShape = ("from" in headers || "보낸 사람" in headers) && ("subject" in headers || "제목" in headers);
  if (!hasEmailShape) return null;
  let body = lines.slice(i + 1).join("\n");
  // Very small multipart handling: keep the first text/plain part.
  const boundary = raw.match(/boundary="?([^"\n;]+)"?/i)?.[1];
  if (boundary) {
    const part = body.split(`--${boundary}`).find((p) => /content-type:\s*text\/plain/i.test(p));
    if (part) body = part.replace(/^[\s\S]*?\n\s*\n/, "");
  }
  return { headers, body };
}

export function parseText(raw: string, fileName: string): ParsedDocument {
  const refYear = new Date().getFullYear();
  const email = splitEmail(raw);
  if (email) {
    const h = email.headers;
    const subject = h.subject ?? h["제목"] ?? "";
    const from = h.from ?? h["보낸 사람"] ?? "";
    const to = h.to ?? h["받는 사람"] ?? "";
    const date = h.date ?? h["날짜"] ?? "";
    const chunks: ParsedChunk[] = [
      { locator: "Email header", text: `Subject: ${subject}\nFrom: ${from}\nTo: ${to}\nDate: ${date}` },
      ...paragraphs(email.body).map((text, i) => ({ locator: `Email body ¶${i + 1}`, text })),
    ];
    return {
      sourceType: "email",
      chunks,
      rows: [],
      documentDate: firstDate(date, refYear) ?? firstDate(email.body, refYear),
      meta: { subject, from, to, date },
    };
  }
  const chunks = paragraphs(raw).map((text, i) => ({ locator: `Paragraph ${i + 1}`, text }));
  return { sourceType: "text", chunks, rows: [], documentDate: firstDate(raw, refYear), meta: { fileName } };
}
