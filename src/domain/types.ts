// Core domain model. See DATA_MODEL.md for field-level documentation.

export type SourceType = "excel" | "ppt" | "pdf" | "text" | "email" | "manual";

export type DocumentStatus = "uploaded" | "extracting" | "extracted" | "failed";

export interface SourceDocument {
  id: string;
  fileName: string;
  sourceType: SourceType;
  mimeType: string;
  size: number;
  storedPath: string; // relative to DATA_DIR
  uploadedAt: string;
  documentDate?: string; // YYYY-MM-DD, best effort
  status: DocumentStatus;
  error?: string;
  extractedBy?: "ai" | "rule";
  chunkCount: number;
  activityCount: number;
}

export interface SourceChunk {
  id: string;
  documentId: string;
  order: number;
  locator: string; // human readable, e.g. "Sheet 'Progress' · Row 5"
  text: string;
}

export type ActivityStatus = "planned" | "in_progress" | "completed" | "delayed" | "on_hold";

export type Channel = "document" | "email" | "phone" | "meeting" | "verbal" | "on_site" | "chat" | "other";

export interface SourceRef {
  documentId: string;
  chunkId: string;
  locator: string;
  quote: string; // verbatim excerpt from the chunk
}

export interface Kpi {
  name: string;
  value: string; // kept as written in the source, e.g. "84.6"
  unit?: string;
  chunkId?: string;
}

export interface WorkActivity {
  id: string;
  activityDate: string; // YYYY-MM-DD
  projectName: string;
  department?: string;
  category?: string;
  activityType: string;
  description: string;
  achievement?: string;
  issue?: string;
  risk?: string;
  nextAction?: string;
  status: ActivityStatus;
  channel: Channel;
  kpis: Kpi[];
  sourceType: SourceType;
  sourceDocumentId?: string;
  sourceFile?: string;
  sourceRefs: SourceRef[];
  confidence: number; // 0..1
  extractedBy: "ai" | "rule" | "user";
  flags: string[]; // guardrail notes, e.g. "kpi '12%' removed: not found in source"
  duplicateOf?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReportType = "weekly" | "monthly" | "quarterly" | "annual" | "custom";
export type Audience = "working" | "team_leader" | "executive";

export type ReportStatus =
  | "DRAFT"
  | "READY_FOR_REVIEW"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "ARCHIVED";

export type ValidationStatus = "VERIFIED" | "SOURCE_FOUND" | "REVIEW_REQUIRED" | "NO_SOURCE";

export type SectionKey =
  | "executive_summary"
  | "key_achievements"
  | "project_progress"
  | "kpi"
  | "issues_risks"
  | "next_actions";

export interface ItemValidation {
  status: ValidationStatus;
  reasons: string[];
  checkedAt: string;
}

export interface ReportItem {
  id: string;
  text: string;
  projectName?: string;
  activityIds: string[];
  origin: "ai" | "user" | "missing_evidence" | "feedback";
  validation: ItemValidation;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface ReportSection {
  key: SectionKey;
  title: string;
  items: ReportItem[];
}

export interface ProjectSnapshot {
  projectName: string;
  status: ActivityStatus;
  activityCount: number;
  hasRisk: boolean;
  lastActivityDate: string;
}

export interface ReportVersion {
  version: string; // "0.1", "0.2", ... "1.0"
  label: string; // "AI Draft", "User Reviewed", "Manager Feedback Applied", "Final"
  createdAt: string;
  author: string;
  sections: ReportSection[];
}

export interface ApprovalComment {
  author: string;
  role: "reviewer" | "submitter";
  text: string;
  at: string;
}

export type ApprovalStatus = "SUBMITTED" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED";

export interface ApprovalRecord {
  externalRef: string; // id issued by the ApprovalAdapter
  adapter: string;
  submitter: string;
  reviewer: string;
  submittedAt: string;
  status: ApprovalStatus;
  comments: ApprovalComment[];
  round: number;
}

export type ProposalStatus = "pending" | "accepted" | "rejected" | "edited";

export interface FeedbackProposal {
  id: string;
  commentText: string;
  itemId: string;
  sectionKey: SectionKey;
  original: string;
  suggested: string;
  rationale: string;
  activityIds: string[];
  status: ProposalStatus;
  finalText?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  audience: Audience;
  status: ReportStatus;
  sections: ReportSection[];
  projectSnapshots: ProjectSnapshot[];
  versions: ReportVersion[];
  proposals: FeedbackProposal[];
  ignoredActivityIds: string[];
  approval?: ApprovalRecord;
  generatedBy: "ai" | "rule";
  cycleId?: string;
  author: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  archive?: { adapter: string; path: string; archivedAt: string };
}

export type TriggerType = "GPS_ARRIVAL" | "REPORTING_SCHEDULE" | "MANUAL";

export interface TriggerEvent {
  id: string;
  type: TriggerType;
  source: "power_automate" | "scheduler" | "demo";
  receivedAt: string;
  payload: Record<string, unknown>;
}

export type CycleState = "notified" | "started" | "snoozed" | "skipped";

export interface ReportingCycle {
  id: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  label: string; // "2026-10 Monthly Report"
  triggerIds: string[];
  state: CycleState;
  snoozeUntil?: string;
  reportId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  userName: string;
  department: string;
  reviewerName: string;
  monthlyLeadDays: number;
  projects: string[]; // known project names, helps classification
}

export interface StoreData {
  version: number;
  settings: Settings;
  documents: SourceDocument[];
  chunks: SourceChunk[];
  activities: WorkActivity[];
  reports: Report[];
  triggers: TriggerEvent[];
  cycles: ReportingCycle[];
}
