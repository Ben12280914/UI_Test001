"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";

export function SubmitPanel({ reportId, resubmit, blockers }: { reportId: string; resubmit: boolean; blockers: string[] }) {
  const [note, setNote] = useState("");
  return (
    <div className="space-y-3">
      <textarea
        className="input min-h-[64px]"
        placeholder={resubmit ? "예) 말씀하신 AI CFT 현업 적용 계획을 보강했습니다." : "상신 의견 (선택)"}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {blockers.map((b) => (
        <div key={b} className="text-xs text-brand-600">
          • {b}
        </div>
      ))}
      <ActionButton url={`/api/approval/${reportId}`} body={{ action: "submit", comment: note }} className="btn-primary" disabled={blockers.length > 0}>
        <Send className="h-4 w-4" /> {resubmit ? "수정본 재상신" : "메모결재 상신"}
      </ActionButton>
    </div>
  );
}
