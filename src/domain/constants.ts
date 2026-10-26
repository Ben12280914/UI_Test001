import type {
  ActivityStatus,
  Audience,
  Channel,
  ReportStatus,
  ReportType,
  SectionKey,
  SourceType,
  ValidationStatus,
} from "./types";

export const SECTION_ORDER: SectionKey[] = [
  "executive_summary",
  "key_achievements",
  "project_progress",
  "kpi",
  "issues_risks",
  "next_actions",
];

export const SECTION_TITLES: Record<SectionKey, string> = {
  executive_summary: "01. Executive Summary",
  key_achievements: "02. Key Achievements",
  project_progress: "03. Project Progress",
  kpi: "04. KPI / Quantitative Impact",
  issues_risks: "05. Issues & Risks",
  next_actions: "06. Next Actions",
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  custom: "Custom",
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  working: "Working Level",
  team_leader: "Team Leader",
  executive: "Executive",
};

// How many items per section each audience gets. Executive reads less, working level reads everything.
export const AUDIENCE_ITEM_LIMIT: Record<Audience, number> = {
  executive: 3,
  team_leader: 6,
  working: 50,
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: "DRAFT",
  READY_FOR_REVIEW: "READY FOR REVIEW",
  SUBMITTED: "SUBMITTED",
  IN_REVIEW: "IN REVIEW",
  CHANGES_REQUESTED: "CHANGES REQUESTED",
  APPROVED: "APPROVED",
  ARCHIVED: "FINAL · ARCHIVED",
};

export const VALIDATION_LABELS: Record<ValidationStatus, string> = {
  VERIFIED: "VERIFIED",
  SOURCE_FOUND: "SOURCE FOUND",
  REVIEW_REQUIRED: "REVIEW REQUIRED",
  NO_SOURCE: "NO SOURCE",
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
  on_hold: "On Hold",
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  document: "Document",
  email: "Email",
  phone: "Phone",
  meeting: "Meeting",
  verbal: "Verbal",
  on_site: "On-site",
  chat: "Chat",
  other: "Other",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  excel: "Excel",
  ppt: "PowerPoint",
  pdf: "PDF",
  text: "Text",
  email: "Email",
  manual: "Manual",
};

export const WORKFLOW_STEPS = [
  { no: "01", key: "trigger", title: "출근 / Trigger", desc: "GPS · Schedule 이벤트 수신" },
  { no: "02", key: "notice", title: "인지", desc: "보고 시점 알림" },
  { no: "03", key: "collect", title: "확인", desc: "자료 수집 · 이해" },
  { no: "04", key: "generate", title: "실행", desc: "보고서 초안 생성" },
  { no: "05", key: "validate", title: "검토", desc: "Source 검증" },
  { no: "06", key: "submit", title: "보고", desc: "메모결재 상신" },
  { no: "07", key: "review", title: "REVIEW", desc: "팀장 피드백 반영" },
  { no: "08", key: "complete", title: "완성", desc: "Final · Repository" },
] as const;

export type WorkflowStepKey = (typeof WORKFLOW_STEPS)[number]["key"];

export const PIPELINE_STAGES = ["TRIGGERED", "COLLECTING", "DRAFTING", "VALIDATING", "APPROVAL", "FINAL"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
