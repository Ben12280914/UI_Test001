"use client";

import { Bell, MapPin } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import type { ReportingCycle } from "@/domain/types";
import { monthNameKo } from "@/domain/period";
import { REPORT_TYPE_LABELS } from "@/domain/constants";

const KO_TYPE: Record<string, string> = { weekly: "주간보고", monthly: "월간보고", quarterly: "분기보고", annual: "연간보고", custom: "보고" };

export function NotificationBanner({ cycle, triggerLabel }: { cycle: ReportingCycle; triggerLabel?: string }) {
  const when = cycle.reportType === "monthly" ? monthNameKo(cycle.periodStart) + " " : "";
  return (
    <div className="card relative overflow-hidden border-brand-200">
      <div className="absolute inset-y-0 left-0 w-1 bg-brand-500" />
      <div className="flex flex-wrap items-center gap-5 px-6 py-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Bell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <MapPin className="h-3.5 w-3.5" /> {triggerLabel ?? "Reporting Trigger"} · 이지가 먼저 알려드립니다
          </div>
          <div className="mt-1 text-lg font-bold text-navy-900">
            {when}
            {KO_TYPE[cycle.reportType]} 작성 시점입니다.
          </div>
          <div className="text-sm text-slate-500">
            {cycle.periodStart} ~ {cycle.periodEnd} · 이번 기간 업무 데이터를 확인할까요? ({REPORT_TYPE_LABELS[cycle.reportType]})
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton url={`/api/cycles/${cycle.id}`} body={{ action: "start" }} className="btn-primary" redirect="/data-space">
            보고서 준비 시작
          </ActionButton>
          <ActionButton url={`/api/cycles/${cycle.id}`} body={{ action: "snooze" }}>
            내일 다시 알림
          </ActionButton>
          <ActionButton url={`/api/cycles/${cycle.id}`} body={{ action: "skip" }} className="btn-ghost" confirm="이번 기간 보고를 제외할까요?">
            이번 {cycle.reportType === "monthly" ? "달" : "기간"} 제외
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
