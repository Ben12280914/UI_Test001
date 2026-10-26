"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, Check, Loader2, MessageSquare, Pencil, Sparkles, X } from "lucide-react";
import { ValidationBadge } from "@/components/ui/Badges";
import { SECTION_TITLES } from "@/domain/constants";
import type { FeedbackProposal, ValidationStatus } from "@/domain/types";
import { api } from "@/lib/api";
import { cx } from "@/lib/format";

interface Props {
  reportId: string;
  comment?: string;
  proposals: FeedbackProposal[];
  itemStatus: Record<string, ValidationStatus>;
  editable: boolean;
  aiLabel: string;
}

export function FeedbackRevision({ reportId, comment, proposals, itemStatus, editable, aiLabel }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");

  async function call(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const data = await api<unknown>(`/api/reports/${reportId}`, "POST", body);
      if (body.action === "propose" && Array.isArray(data) && data.length === 0) {
        setNotice("이 Comment를 Work Memory의 근거로 반영할 수 있는 수정안을 찾지 못했습니다. Validation 화면에서 직접 수정하세요.");
      }
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(null);
    }
  }

  const pending = proposals.filter((p) => p.status === "pending");
  const resolved = proposals.filter((p) => p.status !== "pending");

  return (
    <div className="space-y-4">
      {comment && (
        <div className="flex gap-3 rounded-lg bg-amber-50 px-4 py-3">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <div className="text-xs font-semibold text-amber-700">Manager Feedback</div>
            <div className="text-sm text-slate-800">{comment}</div>
          </div>
        </div>
      )}
      {editable && comment && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-navy" disabled={busy !== null} onClick={() => call("propose", { action: "propose", comment })}>
            {busy === "propose" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Apply Feedback with AI
          </button>
          <span className="text-xs text-slate-500">{aiLabel} · AI는 수정안만 제안하며, 반영 여부는 작성자가 결정합니다.</span>
        </div>
      )}
      {error && <div className="text-sm text-brand-600">{error}</div>}
      {notice && <div className="text-sm text-amber-700">{notice}</div>}

      {pending.map((p) => (
        <div key={p.id} className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs">
            <span className="font-semibold text-navy-800">{SECTION_TITLES[p.sectionKey]}</span>
            <span className="text-slate-400">근거 Activity {p.activityIds.length}건</span>
          </div>
          <div className="space-y-2 px-4 py-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Original</div>
              <div className="text-sm text-slate-500">{p.original}</div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-amber-700">
              <ArrowDown className="h-3.5 w-3.5" /> Feedback: {p.commentText}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Suggested Revision</div>
              {editing === p.id ? (
                <textarea className="input mt-1 min-h-[80px]" value={text} onChange={(e) => setText(e.target.value)} />
              ) : (
                <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-slate-900">{p.suggested}</div>
              )}
              <div className="mt-1 text-xs text-slate-500">{p.rationale}</div>
            </div>
          </div>
          {editable && (
            <div className="flex gap-2 border-t border-slate-100 px-4 py-2.5">
              {editing === p.id ? (
                <>
                  <button
                    type="button"
                    className="btn-navy btn-sm"
                    disabled={busy !== null}
                    onClick={async () => (await call(p.id, { action: "resolveProposal", proposalId: p.id, decision: "edit", text })) && setEditing(null)}
                  >
                    수정본 반영
                  </button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(null)}>
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-primary btn-sm" disabled={busy !== null} onClick={() => call(p.id, { action: "resolveProposal", proposalId: p.id, decision: "accept" })}>
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button type="button" className="btn-outline btn-sm" disabled={busy !== null} onClick={() => call(p.id, { action: "resolveProposal", proposalId: p.id, decision: "reject" })}>
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      setEditing(p.id);
                      setText(p.suggested);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {resolved.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-500">처리된 제안</div>
          {resolved.map((p) => (
            <div key={p.id} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <span className={cx("chip", p.status === "rejected" ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700")}>
                {p.status === "accepted" ? "ACCEPTED" : p.status === "edited" ? "EDITED" : "REJECTED"}
              </span>
              <span className="min-w-0 flex-1 text-slate-600">{p.finalText ?? p.original}</span>
              {itemStatus[p.itemId] && <ValidationBadge status={itemStatus[p.itemId]} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
