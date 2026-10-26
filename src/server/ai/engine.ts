import type {
  ActivityStatus,
  Audience,
  Channel,
  Kpi,
  ReportType,
  SectionKey,
  SourceChunk,
  SourceType,
  WorkActivity,
} from "@/domain/types";
import type { ParsedRow } from "../parsing";

/** Activity as proposed by an engine, before guardrails and before it gets an id. */
export interface ExtractedActivity {
  activityDate: string | null;
  projectName: string;
  department: string | null;
  category: string | null;
  activityType: string;
  description: string;
  achievement: string | null;
  issue: string | null;
  risk: string | null;
  nextAction: string | null;
  status: ActivityStatus;
  channel: Channel;
  kpis: Kpi[];
  sourceRefs: { chunkId: string; quote: string }[];
  confidence: number;
}

export interface ExtractInput {
  fileName: string;
  sourceType: SourceType;
  documentDate?: string;
  chunks: SourceChunk[];
  rows: (ParsedRow & { chunkId: string })[];
  knownProjects: string[];
  department: string;
}

export interface ManualActivityDraft {
  activityDate: string | null;
  projectName: string;
  department: string | null;
  activityType: string;
  description: string;
  channel: Channel;
  status: ActivityStatus;
  achievement: string | null;
  issue: string | null;
  risk: string | null;
  nextAction: string | null;
}

export interface DraftItem {
  sectionKey: SectionKey;
  text: string;
  projectName: string | null;
  activityIds: string[];
}

export interface DraftInput {
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  audience: Audience;
  activities: WorkActivity[];
  department: string;
}

export interface RevisionTarget {
  itemId: string;
  sectionKey: SectionKey;
  text: string;
  projectName?: string;
  activityIds: string[];
}

export interface ProposalDraft {
  itemId: string;
  suggested: string;
  rationale: string;
  activityIds: string[];
}

export interface ReviseInput {
  comment: string;
  items: RevisionTarget[];
  activities: WorkActivity[];
}

export interface AiEngine {
  readonly kind: "live" | "demo";
  readonly label: string;
  extractActivities(input: ExtractInput): Promise<ExtractedActivity[]>;
  structureManualActivity(text: string, knownProjects: string[], today: string): Promise<ManualActivityDraft>;
  draftReport(input: DraftInput): Promise<DraftItem[]>;
  proposeRevisions(input: ReviseInput): Promise<ProposalDraft[]>;
}

export class AiEngineError extends Error {}
