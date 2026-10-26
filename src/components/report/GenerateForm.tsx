"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { AUDIENCE_LABELS, REPORT_TYPE_LABELS, SECTION_ORDER, SECTION_TITLES } from "@/domain/constants";
import { periodFor, toIsoDate } from "@/domain/period";
import type { Audience, ReportType } from "@/domain/types";
import { api } from "@/lib/api";
import { cx } from "@/lib/format";

interface Props {
  activities: { date: string; project: string }[];
  defaults: { type: ReportType; start: string; end: string; cycleId?: string; cycleLabel?: string };
  aiLabel: string;
}

const AUDIENCE_HINT: Record<Audience, string> = {
  working: "상세 업무까지 모두 포함",
  team_leader: "진행 현황과 의사결정 필요 사항 중심",
  executive: "핵심 성과 · 리스크만 간결하게",
};

export function GenerateForm({ activities, defaults, aiLabel }: Props) {
  const router = useRouter();
  const [type, setType] = useState<ReportType>(defaults.type);
  const [ref, setRef] = useState(defaults.start);
  const [custom, setCustom] = useState({ start: defaults.start, end: defaults.end });
  const [audience, setAudience] = useState<Audience>("team_leader");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(() => {
    if (type === "custom") return custom;
    const p = periodFor(type, new Date(`${ref}T12:00:00`));
    return { start: p.start, end: p.end };
  }, [type, ref, custom]);

  const inPeriod = activities.filter((a) => a.date >= period.start && a.date <= period.end);
  const projects = new Set(inPeriod.map((a) => a.project));
  const matchesCycle = defaults.cycleId && type === defaults.type && period.start === defaults.start && period.end === defaults.end;

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: string }>("/api/reports", "POST", {
        type,
        periodStart: period.start,
        periodEnd: period.end,
        audience,
        cycleId: matchesCycle ? defaults.cycleId : undefined,
      });
      router.push(`/reports/${r.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card">
        <div className="space-y-6 px-6 py-5">
          <div>
            <div className="label">Period</div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cx("btn btn-sm border", type === t ? "border-navy-800 bg-navy-800 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50")}
                >
                  {REPORT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
              {type === "custom" ? (
                <>
                  <div>
                    <label className="label">시작일</label>
                    <input type="date" className="input" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">종료일</label>
                    <input type="date" className="input" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} />
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <label className="label">기준일 (이 날짜가 포함된 {REPORT_TYPE_LABELS[type]} 기간)</label>
                  <input type="date" className="input" value={ref} onChange={(e) => setRef(e.target.value || toIsoDate(new Date()))} />
                </div>
              )}
            </div>
            <div className="mt-2 text-sm font-semibold text-navy-800">
              {period.start} ~ {period.end}
            </div>
          </div>

          <div>
            <div className="label">Audience</div>
            <div className="grid gap-2 md:grid-cols-3">
              {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAudience(a)}
                  className={cx(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    audience === a ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500" : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <div className="text-sm font-semibold text-navy-900">{AUDIENCE_LABELS[a]}</div>
                  <div className="text-xs text-slate-500">{AUDIENCE_HINT[a]}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="label">Report Template · 기본 템플릿</div>
            <ol className="grid gap-1.5 md:grid-cols-2">
              {SECTION_ORDER.map((k) => (
                <li key={k} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {SECTION_TITLES[k]}
                </li>
              ))}
            </ol>
            <div className="mt-1.5 text-xs text-slate-400">회사 PPT 템플릿 엔진은 향후 이 구조에 연결됩니다.</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card px-5 py-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">생성 대상 Work Memory</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-3xl font-bold tabular-nums text-navy-900">{inPeriod.length}</div>
              <div className="text-xs text-slate-500">Activities</div>
            </div>
            <div>
              <div className="text-3xl font-bold tabular-nums text-navy-900">{projects.size}</div>
              <div className="text-xs text-slate-500">Projects</div>
            </div>
          </div>
          {inPeriod.length === 0 && <div className="mt-3 text-xs text-brand-600">이 기간의 Work Memory가 없습니다. 자료를 먼저 올려주세요.</div>}
          {matchesCycle && <div className="mt-3 rounded-md bg-navy-50 px-3 py-2 text-xs text-navy-700">현재 보고 주기({defaults.cycleLabel})에 연결됩니다.</div>}
          <button type="button" className="btn-primary mt-4 w-full py-2.5" disabled={busy || inPeriod.length === 0} onClick={generate}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Work Memory를 읽고 초안을 작성하는 중…" : "Generate Report"}
          </button>
          {error && <div className="mt-2 text-sm text-brand-600">{error}</div>}
          <div className="mt-3 text-[11px] leading-relaxed text-slate-400">
            {aiLabel} · 중복 업무를 제거하고 Project 단위로 통합합니다. 모든 문장은 근거 Activity와 연결되며, 근거 없는 문장은 Validation에서 표시됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
