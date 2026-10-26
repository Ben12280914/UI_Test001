"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Brain, FileText, FolderUp, LayoutDashboard, Settings, ShieldCheck, Stamp } from "lucide-react";
import { cx } from "@/lib/format";

const NAV = [
  { href: "/", no: "01", label: "Home / Dashboard", icon: LayoutDashboard },
  { href: "/data-space", no: "02", label: "Data Space", icon: FolderUp },
  { href: "/memory", no: "03", label: "Work Memory", icon: Brain },
  { href: "/generate", no: "04", label: "Report Generator", icon: FileText },
  { href: "/validation", no: "05", label: "Validation", icon: ShieldCheck },
  { href: "/approval", no: "06", label: "Approval", icon: Stamp },
  { href: "/repository", no: "07", label: "Repository", icon: Archive },
  { href: "/settings", no: "08", label: "Settings", icon: Settings },
];

export function Sidebar({ aiLabel, aiLive }: { aiLabel: string; aiLive: boolean }) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/validation" && pathname.startsWith("/reports"));
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-navy-900 text-navy-100">
      <Link href="/" className="flex items-center gap-3 px-5 pb-5 pt-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white">이</span>
        <span className="leading-tight">
          <span className="block text-lg font-bold tracking-tight text-white">이지</span>
          <span className="block text-[11px] font-medium text-navy-400">AI Reporting Agent</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ href, no, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cx(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active(href) ? "bg-white/10 font-semibold text-white" : "text-navy-200 hover:bg-white/5 hover:text-white",
            )}
          >
            <span className={cx("w-5 text-[11px] font-semibold tabular-nums", active(href) ? "text-brand-200" : "text-navy-400")}>{no}</span>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
            {active(href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
          </Link>
        ))}
      </nav>
      <div className="m-3 rounded-lg bg-white/5 px-3 py-2.5 text-[11px] leading-relaxed text-navy-200">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <span className={cx("h-1.5 w-1.5 rounded-full", aiLive ? "bg-emerald-400" : "bg-amber-400")} />
          {aiLive ? "Live AI" : "Demo mode"}
        </div>
        <div className="mt-0.5 truncate text-navy-400">{aiLabel}</div>
      </div>
      <div className="px-5 pb-4 text-[10px] text-navy-400">Work → Memory → Report</div>
    </aside>
  );
}
