import Link from "next/link";
import { Download, FolderUp, RefreshCw, Trash2 } from "lucide-react";
import { Uploader } from "@/components/data/Uploader";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { SourceIcon } from "@/components/ui/SourceIcon";
import { SOURCE_TYPE_LABELS } from "@/domain/constants";
import { cx, fmtBytes, fmtDateTime } from "@/lib/format";
import { listSampleFiles } from "@/server/workflow/demoSeed";
import { getStore } from "@/server/store/jsonFileStore";

const STATUS: Record<string, { label: string; cls: string }> = {
  uploaded: { label: "Uploaded", cls: "bg-slate-100 text-slate-600" },
  extracting: { label: "Extracting", cls: "bg-sky-50 text-sky-700" },
  extracted: { label: "Extracted", cls: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Failed", cls: "bg-brand-50 text-brand-700" },
};

export default async function DataSpacePage() {
  const d = await getStore().read();
  const samples = await listSampleFiles();
  const docs = [...d.documents].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  return (
    <div className="space-y-6">
      <PageHeader
        step="STEP 03 · 확인 / Collect"
        title="Data Space"
        description="업무 중 생긴 Excel · PPT · PDF · Email 자료를 올리면, 이지가 자료를 읽고 업무(Activity)를 추출해 Work Memory에 쌓습니다. 각 Activity는 원본의 시트·행, 슬라이드, 페이지 위치를 기억합니다."
        actions={
          <Link href="/memory" className="btn-outline">
            Work Memory 보기 →
          </Link>
        }
      />
      <Uploader samples={samples} />

      <section className="card">
        <div className="card-header">
          <div className="card-title">업로드된 자료 ({docs.length})</div>
          <span className="text-xs text-slate-400">파일 → Chunk(원본 위치) → Activity</span>
        </div>
        {docs.length === 0 ? (
          <EmptyState icon={<FolderUp className="h-8 w-8" />} title="아직 자료가 없습니다">
            위 영역에 파일을 끌어다 놓으세요.
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Chunks</th>
                <th className="text-right">Activities</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <Link href={`/data-space/${doc.id}`} className="flex items-center gap-3 hover:underline">
                      <SourceIcon type={doc.sourceType} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-navy-900">{doc.fileName}</span>
                        <span className="text-xs text-slate-400">
                          {fmtBytes(doc.size)} · {fmtDateTime(doc.uploadedAt)}
                          {doc.extractedBy && ` · ${doc.extractedBy === "ai" ? "Claude 추출" : "Rule 추출"}`}
                        </span>
                      </span>
                    </Link>
                    {doc.error && <div className="mt-1 text-xs text-brand-600">{doc.error}</div>}
                  </td>
                  <td className="text-slate-600">{SOURCE_TYPE_LABELS[doc.sourceType]}</td>
                  <td className="tabular-nums text-slate-600">{doc.documentDate ?? "—"}</td>
                  <td>
                    <span className={cx("chip", STATUS[doc.status].cls)}>{STATUS[doc.status].label}</span>
                  </td>
                  <td className="text-right tabular-nums">{doc.chunkCount}</td>
                  <td className="text-right tabular-nums font-semibold text-navy-800">{doc.activityCount}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {doc.status === "failed" && (
                        <ActionButton url={`/api/documents/${doc.id}/retry`} className="btn-ghost btn-sm" title="다시 추출">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </ActionButton>
                      )}
                      <a href={`/api/documents/${doc.id}/file`} className="btn-ghost btn-sm" title="원본 다운로드">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <ActionButton
                        url={`/api/documents/${doc.id}`}
                        method="DELETE"
                        className="btn-ghost btn-sm"
                        confirm={`'${doc.fileName}'과 추출된 Activity를 삭제할까요?`}
                        title="삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
