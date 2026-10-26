import Link from "next/link";
import { Check } from "lucide-react";
import { WORKFLOW_STEPS, type WorkflowStepKey } from "@/domain/constants";
import { cx } from "@/lib/format";
import type { StepState } from "@/server/workflow/dashboardService";

const STEP_LINKS: Record<WorkflowStepKey, string> = {
  trigger: "/",
  notice: "/",
  collect: "/data-space",
  generate: "/generate",
  validate: "/validation",
  submit: "/approval",
  review: "/approval",
  complete: "/repository",
};

export function JourneyBar({
  steps,
  label,
  reportId,
  compact = false,
}: {
  steps: { key: WorkflowStepKey; state: StepState }[];
  label?: string;
  reportId?: string;
  compact?: boolean;
}) {
  const href = (key: WorkflowStepKey) => {
    if (reportId && (key === "validate" || key === "generate")) return `/reports/${reportId}`;
    if (reportId && (key === "submit" || key === "review")) return `/approval/${reportId}`;
    return STEP_LINKS[key];
  };
  return (
    <div className="flex items-center gap-3">
      {label && !compact && <div className="hidden shrink-0 text-xs font-semibold text-navy-700 xl:block">{label}</div>}
      <ol className="flex flex-1 items-center">
        {WORKFLOW_STEPS.map((s, i) => {
          const st = steps.find((x) => x.key === s.key)?.state ?? "todo";
          return (
            <li key={s.key} className="flex flex-1 items-center last:flex-none">
              <Link href={href(s.key)} className="group flex items-center gap-1.5" title={`${s.no} ${s.title} — ${s.desc}`}>
                <span
                  className={cx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    st === "done" && "bg-navy-800 text-white",
                    st === "current" && "bg-brand-500 text-white ring-4 ring-brand-100",
                    st === "todo" && "border border-slate-300 bg-white text-slate-400",
                  )}
                >
                  {st === "done" ? <Check className="h-3.5 w-3.5" /> : s.no}
                </span>
                <span
                  className={cx(
                    "hidden whitespace-nowrap text-xs lg:inline",
                    st === "current" ? "font-semibold text-brand-600" : st === "done" ? "text-navy-700" : "text-slate-400",
                  )}
                >
                  {s.title}
                </span>
              </Link>
              {i < WORKFLOW_STEPS.length - 1 && <span className={cx("mx-2 h-px flex-1", st === "done" ? "bg-navy-700" : "bg-slate-200")} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
