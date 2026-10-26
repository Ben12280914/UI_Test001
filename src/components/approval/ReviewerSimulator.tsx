"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import type { ReportStatus } from "@/domain/types";

const SAMPLE_COMMENT = "AI CFT 부분은 결과보다 현업 적용 계획을 조금 더 강조해주세요.";

/** Stand-in for the reviewer's side of 메모결재 while no real approval API exists. */
export function ReviewerSimulator({ reportId, status, reviewer }: { reportId: string; status: ReportStatus; reviewer: string }) {
  const [comment, setComment] = useState(SAMPLE_COMMENT);
  const url = `/api/approval/${reportId}`;
  return (
    <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-violet-700">Mock · 팀장 화면 시뮬레이션</div>
        <div className="text-[11px] text-violet-500">실제 메모결재 API 연동 시 이 영역은 사라집니다</div>
      </div>
      {status === "SUBMITTED" && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">{reviewer}님의 결재함에 도착했습니다.</span>
          <ActionButton url={url} body={{ action: "open" }} className="btn-outline btn-sm">
            {reviewer} 열람
          </ActionButton>
        </div>
      )}
      {status === "IN_REVIEW" && (
        <div className="space-y-2">
          <label className="label">{reviewer} Comment</label>
          <textarea className="input min-h-[64px] bg-white" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex gap-2">
            <ActionButton url={url} body={{ action: "request_changes", comment }} className="btn-outline btn-sm" disabled={!comment.trim()}>
              수정 요청 (Comment 전송)
            </ActionButton>
            <ActionButton url={url} body={{ action: "approve", comment: comment === SAMPLE_COMMENT ? "확인했습니다. 수고했습니다." : comment }} className="btn-navy btn-sm">
              승인
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
