"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Phone, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { ActivityForm, type ActivityFormValue } from "./ActivityForm";

const EXAMPLE = "10월 20일 금형팀과 CAPA 관련해서 전화로 협의했고, 다음 주에 요구사항을 다시 정리하기로 했다.";

interface Structured extends Omit<ActivityFormValue, "activityDate" | "department" | "achievement" | "issue" | "risk" | "nextAction"> {
  activityDate: string | null;
  department: string | null;
  achievement: string | null;
  issue: string | null;
  risk: string | null;
  nextAction: string | null;
  engine: string;
}

export function AddMissingActivity({ projects, defaultDate }: { projects: string[]; defaultDate: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [form, setForm] = useState<ActivityFormValue | null>(null);
  const [engine, setEngine] = useState("");
  const [busy, setBusy] = useState<"structure" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function structure() {
    setBusy("structure");
    setError(null);
    setSaved(null);
    try {
      const r = await api<Structured>("/api/activities/structure", "POST", { text });
      setEngine(r.engine);
      setForm({
        activityDate: r.activityDate ?? defaultDate,
        projectName: r.projectName,
        department: r.department ?? "",
        activityType: r.activityType,
        description: r.description,
        channel: r.channel,
        status: r.status,
        achievement: r.achievement ?? "",
        issue: r.issue ?? "",
        risk: r.risk ?? "",
        nextAction: r.nextAction ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!form) return;
    setBusy("save");
    setError(null);
    try {
      await api("/api/activities", "POST", form);
      setSaved(`'${form.projectName}' 업무가 Work Memory에 추가되었습니다.`);
      setForm(null);
      setText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title flex items-center gap-2">
            <Phone className="h-4 w-4 text-brand-500" /> Add Missing Activity
          </div>
          <div className="text-xs text-slate-500">전화 · 구두 지시 · 현장 대응처럼 자료가 남지 않은 업무를 말하듯 입력하면 이지가 구조화합니다.</div>
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        <textarea
          className="input min-h-[72px]"
          placeholder={`예) ${EXAMPLE}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-navy" disabled={!text.trim() || busy !== null} onClick={structure}>
            {busy === "structure" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI로 구조화
          </button>
          {!text && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => setText(EXAMPLE)}>
              예시 문장 넣기
            </button>
          )}
          {saved && <span className="text-sm text-emerald-700">{saved}</span>}
          {error && <span className="text-sm text-brand-600">{error}</span>}
        </div>
        {form && (
          <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-4">
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-navy-800">구조화 결과 — 확인 후 저장하세요</span>
              <span className="text-slate-400">{engine}</span>
            </div>
            <ActivityForm value={form} onChange={setForm} projects={projects} />
            <div className="mt-3 flex items-center gap-2">
              <button type="button" className="btn-primary" disabled={busy !== null} onClick={save}>
                {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
                Work Memory에 저장
              </button>
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>
                취소
              </button>
              <span className="text-xs text-slate-500">수기 입력 업무는 근거 문서가 없으므로 보고서에서 Review Required로 표시됩니다.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
