import { File, FileSpreadsheet, FileText, Mail, Pencil, Presentation } from "lucide-react";
import type { SourceType } from "@/domain/types";
import { cx } from "@/lib/format";

const MAP = {
  excel: { Icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50" },
  ppt: { Icon: Presentation, color: "text-orange-600 bg-orange-50" },
  pdf: { Icon: FileText, color: "text-brand-600 bg-brand-50" },
  email: { Icon: Mail, color: "text-sky-600 bg-sky-50" },
  text: { Icon: File, color: "text-slate-600 bg-slate-100" },
  manual: { Icon: Pencil, color: "text-violet-600 bg-violet-50" },
} as const;

export function SourceIcon({ type, className }: { type: SourceType; className?: string }) {
  const { Icon, color } = MAP[type];
  return (
    <span className={cx("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", color, className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
