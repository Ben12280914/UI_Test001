import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { JourneyBar } from "@/components/JourneyBar";
import { Sidebar } from "@/components/Sidebar";
import { aiConfig } from "@/server/config";
import { getJourney } from "@/server/workflow/dashboardService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "이지 · AI Reporting Agent",
  description: "Work → Memory → Report. 업무 데이터가 보고서를 만드는 조직으로.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const journey = await getJourney();
  const ai = aiConfig();
  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen">
          <Sidebar aiLive={ai.mode === "live"} aiLabel={ai.mode === "live" ? ai.model : ai.fellBackToDemo ? "API 키 없음 → Demo" : "Rule-based engine"} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-8 py-3 backdrop-blur">
              {journey.cycle ? (
                <JourneyBar steps={journey.steps} label={journey.cycle.label} reportId={journey.report?.id} />
              ) : (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>진행 중인 보고 주기가 없습니다. 출근 Trigger 또는 보고 일정이 도착하면 이지가 먼저 알려드립니다.</span>
                  <span className="font-medium text-navy-700">8-Step Reporting Journey</span>
                </div>
              )}
            </header>
            <main className="flex-1 px-8 py-7">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
