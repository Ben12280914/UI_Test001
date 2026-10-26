import { aiConfig, triggerWebhookSecret } from "../config";
import { MockApprovalAdapter, type ApprovalAdapter } from "./approval";
import { ManualUploadSource, SharePointSource } from "./documentSource";
import { EmailExportUpload, OutlookEmailAdapter } from "./email";
import type { AdapterStatus } from "./errors";
import { InternalRepositoryAdapter, TaekwangRepositoryAdapter, type ReportRepositoryAdapter } from "./reportRepository";
import { DemoTrigger, PowerAutomateWebhookTrigger } from "./trigger";

export * from "./errors";
export * from "./trigger";
export * from "./approval";
export * from "./reportRepository";

// Swap implementations here when real integrations become available.
export const adapters = {
  webhookTrigger: new PowerAutomateWebhookTrigger(),
  demoTrigger: new DemoTrigger(),
  documentSources: [new ManualUploadSource(), new SharePointSource()],
  email: [new EmailExportUpload(), new OutlookEmailAdapter()],
  approval: new MockApprovalAdapter() as ApprovalAdapter,
  repository: new InternalRepositoryAdapter() as ReportRepositoryAdapter,
  externalRepository: new TaekwangRepositoryAdapter() as ReportRepositoryAdapter,
};

export function adapterStatuses(): AdapterStatus[] {
  const ai = aiConfig();
  return [
    {
      layer: "AI",
      name: ai.mode === "live" ? `Claude API (${ai.model})` : "Demo engine (rule-based)",
      state: ai.mode === "live" ? "active" : "mock",
      description: ai.fellBackToDemo
        ? "AI_MODE=live 이지만 API 키가 없어 Demo 엔진으로 동작 중입니다."
        : ai.mode === "live"
          ? `Gateway: ${ai.baseURL ?? "api.anthropic.com"}${ai.proxy ? " · Proxy 사용" : ""}`
          : "네트워크 없이 규칙 기반으로 동작합니다.",
    },
    {
      layer: "Trigger",
      name: adapters.webhookTrigger.name,
      state: triggerWebhookSecret() ? "active" : "not_configured",
      description: triggerWebhookSecret()
        ? "POST /api/triggers/webhook 수신 대기 중"
        : "TRIGGER_WEBHOOK_SECRET 설정 시 활성화됩니다. (데모 시뮬레이터는 항상 사용 가능)",
    },
    { layer: "Document", name: "Data Space upload", state: "active", description: "Excel · PPT · PDF · Text · Email 업로드" },
    { layer: "Document", name: "SharePoint / OneDrive", state: "not_configured", description: "P2 — 자동 수집 예정" },
    { layer: "Email", name: "Outlook", state: "not_configured", description: "P2 — 현재는 .eml / export 파일 업로드" },
    { layer: "Approval", name: adapters.approval.name, state: "mock", description: "사내 메모결재 API 제공 시 교체" },
    { layer: "Repository", name: adapters.repository.name, state: "active", description: "최종 보고서 내부 보관" },
    { layer: "Repository", name: "report.taekwang.com", state: "not_configured", description: "API 명세 제공 시 Adapter 교체" },
  ];
}
