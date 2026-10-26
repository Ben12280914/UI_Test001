import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { ActivityStatusBadge } from "@/components/ui/Badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceIcon } from "@/components/ui/SourceIcon";
import { SOURCE_TYPE_LABELS } from "@/domain/constants";
import { cx } from "@/lib/format";
import { getStore } from "@/server/store/jsonFileStore";

/** Source viewer: every chunk of one document, with the activities that cite it. */
export default async function DocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ chunk?: string }> }) {
  const { id } = await params;
  const { chunk: focus } = await searchParams;
  const d = await getStore().read();
  const doc = d.documents.find((x) => x.id === id);
  if (!doc) notFound();
  const chunks = d.chunks.filter((c) => c.documentId === id).sort((a, b) => a.order - b.order);
  const activities = d.activities.filter((a) => a.sourceDocumentId === id);

  return (
    <div className="space-y-6">
      <PageHeader
        step={`Source · ${SOURCE_TYPE_LABELS[doc.sourceType]}`}
        title={doc.fileName}
        description={`문서 날짜 ${doc.documentDate ?? "미확인"} · Chunk ${chunks.length}개 · Activity ${activities.length}건`}
        actions={
          <>
            <Link href="/data-space" className="btn-ghost">
              ← Data Space
            </Link>
            <a href={`/api/documents/${doc.id}/file`} className="btn-outline">
              <Download className="h-4 w-4" /> 원본 다운로드
            </a>
          </>
        }
      />
      <div className="space-y-3">
        {chunks.map((c) => {
          const citing = activities.filter((a) => a.sourceRefs.some((r) => r.chunkId === c.id));
          return (
            <div key={c.id} id={c.id} className={cx("card scroll-mt-24", focus === c.id && "ring-2 ring-brand-500")}>
              <div className="flex items-start gap-4 px-5 py-4">
                <div className="w-40 shrink-0">
                  <div className="flex items-center gap-2">
                    <SourceIcon type={doc.sourceType} className="h-6 w-6" />
                    <span className="text-xs font-semibold text-navy-800">{c.locator}</span>
                  </div>
                </div>
                <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-700">{c.text}</pre>
                <div className="w-64 shrink-0 space-y-1.5">
                  {citing.length === 0 ? (
                    <span className="text-xs text-slate-300">인용된 Activity 없음</span>
                  ) : (
                    citing.map((a) => (
                      <Link key={a.id} href={`/memory?focus=${a.id}`} className="block rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs hover:bg-navy-50">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-navy-800">{a.projectName}</span>
                          <ActivityStatusBadge status={a.status} />
                        </div>
                        <div className="mt-0.5 truncate text-slate-500">{a.description}</div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
