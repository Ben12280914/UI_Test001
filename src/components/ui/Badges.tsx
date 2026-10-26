import { AlertTriangle, CheckCircle2, CircleDot, XCircle } from "lucide-react";
import {
  ACTIVITY_STATUS_LABELS,
  REPORT_STATUS_LABELS,
  VALIDATION_LABELS,
} from "@/domain/constants";
import type { ActivityStatus, ReportStatus, ValidationStatus } from "@/domain/types";
import { cx } from "@/lib/format";

const VALIDATION_STYLE: Record<ValidationStatus, string> = {
  VERIFIED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  SOURCE_FOUND: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  REVIEW_REQUIRED: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  NO_SOURCE: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
};

const VALIDATION_ICON = {
  VERIFIED: CheckCircle2,
  SOURCE_FOUND: CircleDot,
  REVIEW_REQUIRED: AlertTriangle,
  NO_SOURCE: XCircle,
};

export function ValidationBadge({ status, className }: { status: ValidationStatus; className?: string }) {
  const Icon = VALIDATION_ICON[status];
  return (
    <span className={cx("chip whitespace-nowrap", VALIDATION_STYLE[status], className)}>
      <Icon className="h-3 w-3" />
      {VALIDATION_LABELS[status]}
    </span>
  );
}

export function ValidationDot({ status }: { status: ValidationStatus }) {
  const color = { VERIFIED: "bg-emerald-500", SOURCE_FOUND: "bg-sky-500", REVIEW_REQUIRED: "bg-amber-500", NO_SOURCE: "bg-brand-500" }[status];
  return <span className={cx("mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full", color)} title={VALIDATION_LABELS[status]} />;
}

const REPORT_STYLE: Record<ReportStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  READY_FOR_REVIEW: "bg-sky-50 text-sky-700",
  SUBMITTED: "bg-indigo-50 text-indigo-700",
  IN_REVIEW: "bg-violet-50 text-violet-700",
  CHANGES_REQUESTED: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-navy-800 text-white",
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <span className={cx("chip whitespace-nowrap", REPORT_STYLE[status])}>{REPORT_STATUS_LABELS[status]}</span>;
}

const ACT_STYLE: Record<ActivityStatus, string> = {
  planned: "bg-slate-100 text-slate-600",
  in_progress: "bg-sky-50 text-sky-700",
  completed: "bg-emerald-50 text-emerald-700",
  delayed: "bg-brand-50 text-brand-700",
  on_hold: "bg-slate-100 text-slate-500",
};

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  return <span className={cx("chip whitespace-nowrap", ACT_STYLE[status])}>{ACTIVITY_STATUS_LABELS[status]}</span>;
}
