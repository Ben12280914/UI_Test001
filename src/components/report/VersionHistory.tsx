import Link from "next/link";
import type { Report } from "@/domain/types";
import { cx, fmtDateTime } from "@/lib/format";

export function VersionHistory({ report, selected }: { report: Report; selected?: string }) {
  const versions = report.versions;
  const idx = Math.max(0, versions.findIndex((v) => v.version === selected));
  const current = versions[selected ? idx : versions.length - 1];
  const prev = versions[versions.indexOf(current) - 1];
  const prevText = new Map(prev?.sections.flatMap((s) => s.items.map((i) => [i.id, i.text] as const)) ?? []);

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <ol className="card divide-y divide-slate-100 self-start">
        {versions.map((v) => (
          <li key={v.version}>
            <Link
              href={`/reports/${report.id}?tab=versions&v=${v.version}`}
              className={cx("block px-4 py-3 hover:bg-slate-50", v === current && "bg-navy-50")}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-navy-900">v{v.version}</span>
                <span className="text-[11px] text-slate-400">{fmtDateTime(v.createdAt)}</span>
              </div>
              <div className="text-xs text-slate-600">{v.label}</div>
              <div className="text-[11px] text-slate-400">{v.author}</div>
            </Link>
          </li>
        ))}
      </ol>
      {current && (
        <div className="card px-6 py-5">
          <div className="mb-4 text-sm font-semibold text-navy-900">
            v{current.version} · {current.label}
            {prev && <span className="ml-2 text-xs font-normal text-slate-400">v{prev.version} 대비 변경 표시</span>}
          </div>
          <div className="space-y-4">
            {current.sections.map((s) => (
              <div key={s.key}>
                <div className="mb-1 text-xs font-bold text-navy-800">{s.title}</div>
                <ul className="space-y-1.5">
                  {s.items.map((i) => {
                    const before = prevText.get(i.id);
                    const changed = prev && before !== undefined && before !== i.text;
                    const added = prev && before === undefined;
                    return (
                      <li key={i.id} className={cx("rounded px-2 py-1 text-sm", changed && "bg-amber-50", added && "bg-emerald-50")}>
                        {changed && <div className="text-xs text-slate-400 line-through">{before}</div>}
                        <span className="text-slate-800">{i.text}</span>
                        {added && <span className="ml-2 chip bg-emerald-100 text-emerald-700">추가</span>}
                      </li>
                    );
                  })}
                  {s.items.length === 0 && <li className="text-xs text-slate-400">—</li>}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
