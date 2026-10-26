import { ActionButton } from "@/components/ui/ActionButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { cx } from "@/lib/format";
import { adapterStatuses } from "@/server/adapters";
import { aiConfig } from "@/server/config";
import { getSettings } from "@/server/workflow/settingsService";

const STATE = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700" },
  mock: { label: "Mock", cls: "bg-violet-50 text-violet-700" },
  not_configured: { label: "Not configured", cls: "bg-slate-100 text-slate-500" },
};

export default async function SettingsPage() {
  const settings = await getSettings();
  const ai = aiConfig();
  const statuses = adapterStatuses();
  return (
    <div className="space-y-6">
      <PageHeader step="Settings" title="Settings" description="작성자 · 결재자 · 보고 일정과 연동(Adapter) 상태를 관리합니다." />

      <section className="card">
        <div className="card-header">
          <div className="card-title">사용자 · 보고 일정</div>
        </div>
        <div className="px-5 py-4">
          <SettingsForm settings={settings} />
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">AI Engine</div>
          <span className={cx("chip", ai.mode === "live" ? STATE.active.cls : STATE.mock.cls)}>{ai.mode === "live" ? "LIVE" : "DEMO"}</span>
        </div>
        <dl className="grid grid-cols-2 gap-4 px-5 py-4 text-sm md:grid-cols-4">
          <div>
            <dt className="label">AI_MODE</dt>
            <dd>{ai.requested}</dd>
          </div>
          <div>
            <dt className="label">Model</dt>
            <dd className="font-mono text-xs">{ai.model}</dd>
          </div>
          <div>
            <dt className="label">API Key</dt>
            <dd>{ai.hasKey ? "설정됨 (.env)" : "없음"}</dd>
          </div>
          <div>
            <dt className="label">Gateway / Proxy</dt>
            <dd className="text-xs">
              {ai.baseURL ?? "api.anthropic.com"}
              {ai.proxy ? " · proxy" : ""}
            </dd>
          </div>
        </dl>
        {ai.fellBackToDemo && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-amber-700">AI_MODE=live 이지만 ANTHROPIC_API_KEY가 없어 Demo 엔진으로 동작 중입니다. 서버의 .env.local을 확인하세요.</div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Integration Adapters</div>
          <span className="text-xs text-slate-400">실제 API가 생기면 Adapter만 교체합니다</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Layer</th>
              <th>Adapter</th>
              <th>State</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s) => (
              <tr key={s.layer + s.name}>
                <td className="text-xs font-semibold text-slate-500">{s.layer}</td>
                <td className="font-medium text-navy-900">{s.name}</td>
                <td>
                  <span className={cx("chip", STATE[s.state].cls)}>{STATE[s.state].label}</span>
                </td>
                <td className="text-xs text-slate-500">{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Trigger Webhook (Step 01)</div>
        </div>
        <div className="space-y-2 px-5 py-4 text-sm text-slate-600">
          <p>Power Automate, Windows 로그온 작업, iOS 단축어 등 어떤 도구든 아래 형식으로 호출하면 출근 Trigger가 들어옵니다.</p>
          <pre className="overflow-x-auto rounded-lg bg-navy-900 px-4 py-3 text-xs leading-relaxed text-navy-100">{`POST {이지 서버 주소}/api/triggers/webhook
x-trigger-secret: {TRIGGER_WEBHOOK_SECRET}
Content-Type: application/json

{ "type": "GPS_ARRIVAL", "location": "HQ", "occurredAt": "2026-10-26T08:41:00+09:00" }`}</pre>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Demo Data</div>
          <span className="text-xs text-slate-400">합성(Synthetic) 데이터만 사용합니다</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <ActionButton
            url="/api/settings/reset"
            body={{ mode: "seed" }}
            className="btn-primary"
            confirm="모든 데이터를 지우고 데모 기준 데이터(9월 월간보고)를 다시 만들까요?"
            redirect="/"
          >
            데모 시나리오 초기화
          </ActionButton>
          <ActionButton url="/api/settings/reset" body={{ mode: "empty" }} className="btn-outline" confirm="Work Memory, 보고서, 업로드 파일을 모두 삭제할까요?" redirect="/">
            전체 데이터 삭제
          </ActionButton>
          <span className="text-xs text-slate-500">초기화하면 9월 월간보고가 승인·보관된 상태로 생성되어, 10월 보고서와 비교할 수 있습니다.</span>
        </div>
      </section>
    </div>
  );
}
