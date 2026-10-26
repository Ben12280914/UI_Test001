"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, ExternalLink, Loader2, Pencil, Trash2, X } from "lucide-react";
import { ValidationBadge } from "@/components/ui/Badges";
import { SourceIcon } from "@/components/ui/SourceIcon";
import { CHANNEL_LABELS } from "@/domain/constants";
import type { Report, ReportItem, SourceChunk, SourceDocument, WorkActivity } from "@/domain/types";
import { api } from "@/lib/api";
import { cx } from "@/lib/format";

interface Props {
  report: Report;
  activities: Record<string, WorkActivity>;
  chunks: Record<string, SourceChunk>;
  documents: Record<string, Pick<SourceDocument, "id" | "fileName" | "sourceType">>;
  editable: boolean;
}

function Highlight({ text, quote }: { text: string; quote: string }) {
  const q = quote.trim();
  const idx = q ? text.indexOf(q) : -1;
  if (idx < 0 || q.length >= text.length) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-amber-100 px-0.5 text-slate-900">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function ValidationWorkspace({ report, activities, chunks, documents, editable }: Props) {
  const router = useRouter();
  const allItems = useMemo(() => report.sections.flatMap((s) => s.items), [report]);
  const firstAttention = allItems.find((i) => i.validation.status === "NO_SOURCE" || i.validation.status === "REVIEW_REQUIRED");
  const [selectedId, setSelectedId] = useState<string | undefined>(firstAttention?.id ?? allItems[0]?.id);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = allItems.find((i) => i.id === selectedId);

  async function act(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setError(null);
    try {
      await api(`/api/reports/${report.id}`, "POST", body);
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(null);
    }
  }

  const renderItem = (item: ReportItem) => (
    <li
      key={item.id}
      onClick={() => setSelectedId(item.id)}
      className={cx(
        "cursor-pointer rounded-lg border px-3.5 py-3 transition-colors",
        selectedId === item.id ? "border-navy-600 bg-navy-50/50 ring-1 ring-navy-600" : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {editing === item.id ? (
            <div onClick={(e) => e.stopPropagation()}>
              <textarea className="input min-h-[80px]" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="btn-navy btn-sm"
                  disabled={busy !== null}
                  onClick={async () => {
                    if (await act(`edit-${item.id}`, { action: "updateItem", itemId: item.id, text: draft })) setEditing(null);
                  }}
                >
                  {busy === `edit-${item.id}` && <Loader2 className="h-3 w-3 animate-spin" />} 저장
                </button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(null)}>
                  취소
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-slate-800">{item.text}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ValidationBadge status={item.validation.status} />
            {item.origin !== "ai" && (
              <span className="chip bg-slate-100 text-slate-500">
                {item.origin === "missing_evidence" ? "Missing Evidence에서 추가" : item.origin === "feedback" ? "피드백 반영" : "사용자 작성"}
              </span>
            )}
            <span className="text-[11px] text-slate-400">근거 {item.activityIds.length}건</span>
          </div>
        </div>
        {editable && editing !== item.id && (
          <div className="flex shrink-0 flex-col gap-1" onClick={(e) => e.stopPropagation()}>
            {item.validation.status === "VERIFIED" ? (
              <button type="button" className="btn-ghost btn-sm" title="확인 취소" onClick={() => act(`v-${item.id}`, { action: "unverify", itemId: item.id })}>
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                className="btn-outline btn-sm"
                title="Source를 확인했습니다"
                disabled={item.validation.status === "NO_SOURCE" || busy !== null}
                onClick={() => act(`v-${item.id}`, { action: "verify", itemId: item.id })}
              >
                {busy === `v-${item.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
            )}
            <button
              type="button"
              className="btn-ghost btn-sm"
              title="수정"
              onClick={() => {
                setEditing(item.id);
                setDraft(item.text);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              title="삭제"
              onClick={() => window.confirm("이 항목을 보고서에서 삭제할까요?") && act(`d-${item.id}`, { action: "deleteItem", itemId: item.id })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </li>
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="space-y-5">
        {error && <div className="rounded-lg bg-brand-50 px-4 py-2 text-sm text-brand-700">{error}</div>}
        {report.sections.map((s) => (
          <section key={s.key}>
            <h3 className="mb-2 text-sm font-bold text-navy-900">{s.title}</h3>
            {s.items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-400">해당 기간에 이 섹션의 근거가 없습니다.</div>
            ) : (
              <ul className="space-y-2">{s.items.map(renderItem)}</ul>
            )}
          </section>
        ))}
      </div>

      <aside className="xl:sticky xl:top-20 xl:self-start">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Source Evidence</div>
            {selected && <ValidationBadge status={selected.validation.status} />}
          </div>
          {!selected ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">항목을 선택하면 근거를 보여드립니다.</div>
          ) : (
            <div className="max-h-[calc(100vh-11rem)] space-y-4 overflow-y-auto px-5 py-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-800">{selected.text}</div>
              <ul className="space-y-1 text-xs">
                {selected.validation.reasons.map((r) => (
                  <li
                    key={r}
                    className={cx(
                      "flex gap-1.5",
                      selected.validation.status === "NO_SOURCE" ? "text-brand-700" : selected.validation.status === "REVIEW_REQUIRED" ? "text-amber-700" : "text-slate-500",
                    )}
                  >
                    <span>•</span>
                    {r}
                  </li>
                ))}
              </ul>
              {selected.activityIds.map((id) => {
                const a = activities[id];
                if (!a)
                  return (
                    <div key={id} className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-700">
                      삭제되었거나 존재하지 않는 Activity ({id})
                    </div>
                  );
                return (
                  <div key={id} className="rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-navy-900">{a.projectName}</div>
                        <div className="text-[11px] text-slate-400">
                          {a.activityDate} · {a.activityType} · {CHANNEL_LABELS[a.channel]}
                        </div>
                      </div>
                      <Link href={`/memory?month=all&focus=${a.id}#${a.id}`} className="text-[11px] text-navy-600 hover:underline">
                        Memory →
                      </Link>
                    </div>
                    <div className="space-y-2 px-3 py-2.5">
                      <div className="text-xs text-slate-600">{a.description}</div>
                      {a.sourceRefs.length === 0 ? (
                        <div className="rounded bg-violet-50 px-2 py-1.5 text-[11px] text-violet-700">
                          수기 입력 업무 (근거 문서 없음) — 작성자가 내용을 확인해야 합니다.
                        </div>
                      ) : (
                        a.sourceRefs.map((r) => {
                          const c = chunks[r.chunkId];
                          const doc = documents[r.documentId];
                          return (
                            <div key={r.chunkId} className="rounded-md bg-slate-50">
                              <Link
                                href={`/data-space/${r.documentId}?chunk=${r.chunkId}#${r.chunkId}`}
                                className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold text-sky-700 hover:underline"
                              >
                                {doc && <SourceIcon type={doc.sourceType} className="h-5 w-5" />}
                                <span className="truncate">{doc?.fileName ?? a.sourceFile}</span>
                                <span className="shrink-0 text-slate-400">· {r.locator}</span>
                                <ExternalLink className="ml-auto h-3 w-3 shrink-0" />
                              </Link>
                              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words px-2.5 pb-2 font-sans text-[12px] leading-relaxed text-slate-600">
                                {c ? <Highlight text={c.text} quote={r.quote} /> : r.quote}
                              </pre>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
