import JSZip from "jszip";
import type { ParsedChunk, ParsedDocument } from "./types";

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

function slideText(xml: string): string {
  const paragraphs: string[] = [];
  for (const p of xml.match(/<a:p[\s>][\s\S]*?<\/a:p>/g) ?? []) {
    const runs = [...p.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXml(m[1]));
    const line = runs.join("").trim();
    if (line) paragraphs.push(line);
  }
  return paragraphs.join("\n");
}

export async function parsePptx(buffer: Buffer): Promise<ParsedDocument> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));

  const chunks: ParsedChunk[] = [];
  for (const f of slideFiles) {
    const no = Number(f.match(/(\d+)\.xml$/)![1]);
    const text = slideText(await zip.file(f)!.async("string"));
    if (text) chunks.push({ locator: `Slide ${no}`, text });
  }
  return { sourceType: "ppt", chunks, rows: [], meta: { slides: String(slideFiles.length) } };
}
