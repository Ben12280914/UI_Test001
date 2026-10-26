import { promises as fs } from "node:fs";
import path from "node:path";
import type { SourceChunk, SourceDocument, WorkActivity } from "@/domain/types";
import { toIsoDate } from "@/domain/period";
import { getEngine, AiEngineError } from "../ai";
import { sanitizeExtracted } from "../ai/guardrails";
import { dataDir } from "../config";
import { newId, nowIso } from "../ids";
import { detectSourceType, parseDocument } from "../parsing";
import { getStore } from "../store/jsonFileStore";
import { markDuplicates } from "../validation/duplicates";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export interface IngestResult {
  document: SourceDocument;
  activityCount: number;
  dropped: number;
  error?: string;
}

function safeName(name: string): string {
  return path.basename(name).replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120);
}

export async function ingestFile(file: { fileName: string; mimeType: string; buffer: Buffer }): Promise<IngestResult> {
  const sourceType = detectSourceType(file.fileName);
  if (!sourceType) throw new Error(`지원하지 않는 형식입니다: ${file.fileName}`);
  if (file.buffer.length > MAX_UPLOAD_BYTES) throw new Error(`파일이 너무 큽니다 (최대 20MB): ${file.fileName}`);

  const docId = newId("doc");
  const storedPath = path.join("uploads", `${docId}__${safeName(file.fileName)}`);
  await fs.mkdir(path.join(dataDir(), "uploads"), { recursive: true });
  await fs.writeFile(path.join(dataDir(), storedPath), file.buffer);

  const store = getStore();
  const baseDoc: SourceDocument = {
    id: docId,
    fileName: file.fileName,
    sourceType,
    mimeType: file.mimeType,
    size: file.buffer.length,
    storedPath,
    uploadedAt: nowIso(),
    status: "extracting",
    chunkCount: 0,
    activityCount: 0,
  };

  let chunks: SourceChunk[] = [];
  try {
    const parsed = await parseDocument(file.buffer, file.fileName);
    chunks = parsed.chunks.map((c, i) => ({ id: `${docId}_c${i + 1}`, documentId: docId, order: i, locator: c.locator, text: c.text }));
    baseDoc.sourceType = parsed.sourceType;
    baseDoc.documentDate = parsed.documentDate;
    baseDoc.chunkCount = chunks.length;
    await store.update((d) => {
      d.documents.push(baseDoc);
      d.chunks.push(...chunks);
    });
    return await extractInto(baseDoc, chunks, parsed.rows.map((r) => ({ ...r, chunkId: chunks[r.chunkIndex].id })));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await store.update((d) => {
      const existing = d.documents.find((x) => x.id === docId);
      if (existing) Object.assign(existing, { status: "failed", error: message });
      else d.documents.push({ ...baseDoc, status: "failed", error: message });
    });
    const doc = (await store.read()).documents.find((x) => x.id === docId)!;
    return { document: doc, activityCount: 0, dropped: 0, error: message };
  }
}

async function extractInto(
  doc: SourceDocument,
  chunks: SourceChunk[],
  rows: Parameters<ReturnType<typeof getEngine>["extractActivities"]>[0]["rows"],
): Promise<IngestResult> {
  const store = getStore();
  const { settings } = await store.read();
  const engine = getEngine();
  const extracted = await engine.extractActivities({
    fileName: doc.fileName,
    sourceType: doc.sourceType,
    documentDate: doc.documentDate,
    chunks,
    rows,
    knownProjects: settings.projects,
    department: settings.department,
  });
  const fallbackDate = doc.documentDate ?? toIsoDate(new Date(doc.uploadedAt));
  const { kept, dropped } = sanitizeExtracted(extracted, chunks, fallbackDate);
  const chunkById = new Map(chunks.map((c) => [c.id, c]));

  return store.update((d) => {
    const now = nowIso();
    const activities: WorkActivity[] = kept.map((a) => ({
      id: newId("act"),
      activityDate: a.activityDate!,
      projectName: a.projectName.trim(),
      department: a.department ?? settings.department,
      category: a.category ?? undefined,
      activityType: a.activityType,
      description: a.description,
      achievement: a.achievement ?? undefined,
      issue: a.issue ?? undefined,
      risk: a.risk ?? undefined,
      nextAction: a.nextAction ?? undefined,
      status: a.status,
      channel: a.channel,
      kpis: a.kpis,
      sourceType: doc.sourceType,
      sourceDocumentId: doc.id,
      sourceFile: doc.fileName,
      sourceRefs: a.sourceRefs.map((r) => ({ documentId: doc.id, chunkId: r.chunkId, locator: chunkById.get(r.chunkId)!.locator, quote: r.quote })),
      confidence: a.confidence,
      extractedBy: engine.kind === "live" ? "ai" : "rule",
      flags: a.flags,
      createdAt: now,
      updatedAt: now,
    }));
    d.activities.push(...activities);
    const dupOf = markDuplicates(d.activities);
    for (const a of d.activities) {
      const original = dupOf.get(a.id);
      if (original && !a.duplicateOf) {
        a.duplicateOf = original;
        a.flags.push("중복 업무로 판단되어 보고서 생성에서 제외");
      }
    }
    for (const a of activities) {
      if (!d.settings.projects.some((p) => p.toLowerCase() === a.projectName.toLowerCase())) d.settings.projects.push(a.projectName);
    }
    const target = d.documents.find((x) => x.id === doc.id)!;
    Object.assign(target, {
      status: "extracted",
      error: undefined,
      extractedBy: engine.kind === "live" ? "ai" : "rule",
      activityCount: activities.length,
    });
    return { document: { ...target }, activityCount: activities.length, dropped };
  });
}

/** Retry extraction for a document whose extraction failed (e.g. network error in live mode). */
export async function retryExtraction(docId: string): Promise<IngestResult> {
  const store = getStore();
  const data = await store.read();
  const doc = data.documents.find((x) => x.id === docId);
  if (!doc) throw new Error("문서를 찾을 수 없습니다.");
  if (data.activities.some((a) => a.sourceDocumentId === docId)) throw new Error("이미 추출된 문서입니다.");
  const buffer = await fs.readFile(path.join(dataDir(), doc.storedPath));
  try {
    const parsed = await parseDocument(buffer, doc.fileName);
    let chunks = data.chunks.filter((c) => c.documentId === docId);
    if (!chunks.length) {
      chunks = parsed.chunks.map((c, i) => ({ id: `${docId}_c${i + 1}`, documentId: docId, order: i, locator: c.locator, text: c.text }));
      await store.update((d) => {
        d.chunks.push(...chunks);
        const t = d.documents.find((x) => x.id === docId)!;
        t.chunkCount = chunks.length;
        t.documentDate = parsed.documentDate;
      });
    }
    await store.update((d) => {
      Object.assign(d.documents.find((x) => x.id === docId)!, { status: "extracting", error: undefined });
    });
    return await extractInto({ ...doc, documentDate: parsed.documentDate ?? doc.documentDate }, chunks, parsed.rows.map((r) => ({ ...r, chunkId: chunks[r.chunkIndex]?.id ?? "" })));
  } catch (err) {
    const message = err instanceof AiEngineError || err instanceof Error ? err.message : String(err);
    await store.update((d) => {
      Object.assign(d.documents.find((x) => x.id === docId)!, { status: "failed", error: message });
    });
    throw new Error(message);
  }
}

export async function deleteDocument(docId: string): Promise<void> {
  const store = getStore();
  const storedPath = await store.update((d) => {
    const doc = d.documents.find((x) => x.id === docId);
    if (!doc) throw new Error("문서를 찾을 수 없습니다.");
    const actIds = new Set(d.activities.filter((a) => a.sourceDocumentId === docId).map((a) => a.id));
    const cited = d.reports.some((r) => r.status !== "DRAFT" && r.sections.some((s) => s.items.some((i) => i.activityIds.some((id) => actIds.has(id)))));
    if (cited) throw new Error("검토/결재 중이거나 완료된 보고서의 근거 문서는 삭제할 수 없습니다.");
    d.documents = d.documents.filter((x) => x.id !== docId);
    d.chunks = d.chunks.filter((c) => c.documentId !== docId);
    d.activities = d.activities.filter((a) => !actIds.has(a.id));
    return doc.storedPath;
  });
  await fs.rm(path.join(dataDir(), storedPath), { force: true });
}

export async function readStoredFile(docId: string): Promise<{ doc: SourceDocument; buffer: Buffer }> {
  const data = await getStore().read();
  const doc = data.documents.find((x) => x.id === docId);
  if (!doc) throw new Error("문서를 찾을 수 없습니다.");
  const resolved = path.resolve(dataDir(), doc.storedPath);
  if (!resolved.startsWith(path.resolve(dataDir()) + path.sep)) throw new Error("잘못된 경로입니다.");
  return { doc, buffer: await fs.readFile(resolved) };
}
