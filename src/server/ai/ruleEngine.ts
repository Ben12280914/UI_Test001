import type { ActivityStatus, Channel, Kpi, SectionKey, SourceChunk, WorkActivity } from "@/domain/types";
import { AUDIENCE_ITEM_LIMIT } from "@/domain/constants";
import { firstDate } from "../parsing/dates";
import { sameProject } from "../validation/duplicates";
import type {
  AiEngine,
  DraftInput,
  DraftItem,
  ExtractedActivity,
  ExtractInput,
  ManualActivityDraft,
  ProposalDraft,
  ReviseInput,
} from "./engine";

/**
 * Deterministic engine used for demos and when no API key is configured.
 * It only restates what is written in the source: every sentence is assembled from extracted fields.
 */

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "일자", "날짜", "activity date", "작업일"],
  project: ["project", "프로젝트", "과제", "과제명", "project name"],
  department: ["department", "부서", "dept", "팀"],
  category: ["category", "구분", "분류"],
  activity: ["activity", "활동", "업무", "업무내용", "activity type", "작업"],
  description: ["description", "내용", "상세", "details", "summary"],
  status: ["status", "상태", "진행상태"],
  achievement: ["achievement", "성과", "실적", "result"],
  issue: ["issue", "이슈", "문제"],
  risk: ["risk", "리스크", "위험"],
  next: ["next action", "next", "다음 단계", "향후 계획", "next step", "후속조치"],
  kpiName: ["kpi", "kpi name", "지표", "지표명"],
  kpiValue: ["kpi value", "value", "값", "실적값", "수치"],
  kpiUnit: ["unit", "단위"],
};

function mapHeader(header: string): string | undefined {
  const h = header.trim().toLowerCase();
  return Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.includes(h))?.[0];
}

export function parseStatus(text: string | undefined): ActivityStatus {
  const t = (text ?? "").toLowerCase();
  if (/완료|종료|completed|done|closed/.test(t)) return "completed";
  if (/지연|delay|late|overdue/.test(t)) return "delayed";
  if (/보류|hold|중단/.test(t)) return "on_hold";
  if (/예정|계획|planned|not started|착수 전/.test(t)) return "planned";
  return "in_progress";
}

const ACHIEVEMENT_RE = /완료|달성|수료|발표|개선|절감|도입|확정|구축|향상|선정|completed|achieved|improved|reduced|launched|delivered|increased/i;
const ISSUE_RE = /이슈|문제|지연|부족|미흡|불량|issue|problem|blocker|delay|shortage/i;
const RISK_RE = /리스크|위험|우려|risk|concern/i;
const NEXT_RE = /다음|향후|예정|계획|추진|하기로|next step|next action|plan(?:ned)? to|will /i;
const UNIT_RE = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(%p|%|명|건|개|시간|억원|억|만원|원|pt|회|hours?|people|cases|points|markers)/gi;

function clean(line: string): string {
  return line.replace(/^[\s•\-–·*▶►■□○●]+/, "").replace(/\s+/g, " ").trim();
}

function detectProject(text: string, fileName: string, known: string[]): string | undefined {
  const explicit = text.match(/(?:과제|프로젝트|Project)\s*(?:명)?\s*[:：]\s*([^\n|]+)/i)?.[1];
  if (explicit) return clean(explicit);
  const hay = `${fileName}\n${text}`.toLowerCase().replace(/[_\-]/g, " ");
  return [...known].sort((a, b) => b.length - a.length).find((p) => hay.includes(p.toLowerCase()));
}

function projectFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/20\d{2}[-_.]?\d{0,2}[-_.]?\d{0,2}/g, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\b(result|status|review|report|email|mail|notes?|final|v\d+)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function activityTypeOf(text: string): string {
  const pairs: [RegExp, string][] = [
    [/교육|training|workshop|bootcamp/i, "교육/육성"],
    [/발표|presentation/i, "결과 발표"],
    [/협의|회의|meeting|미팅/i, "협의/회의"],
    [/검토|review|분석|analysis|poc|pilot/i, "검토/분석"],
    [/개선|improvement|kaizen/i, "개선 활동"],
    [/보고|report/i, "보고"],
  ];
  return pairs.find(([re]) => re.test(text))?.[1] ?? "업무 수행";
}

const NAME_STOP_TAIL = /\s+(from|to|of|by|at|is|was|the|a|에서|로|으로)$/i;

/** Name of a quantity = the few words right before the number, within the same clause. */
function kpiName(before: string): string {
  let seg = before.split(/[—–:：(/|,]/).pop() ?? "";
  seg = seg.replace(/(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*\S*/g, " ");
  let words = seg.trim().split(/\s+/).filter(Boolean).slice(-3).join(" ");
  for (let i = 0; i < 3; i++) words = words.replace(NAME_STOP_TAIL, "");
  return words.replace(/(이|가|은|는|을|를|의)$/, "").trim() || "지표";
}

function kpisFrom(line: string, chunkId: string): Kpi[] {
  const out: Kpi[] = [];
  const stripped = line.replace(/\([^)]*\)/g, " ");
  for (const m of stripped.matchAll(UNIT_RE)) {
    const name = kpiName(stripped.slice(0, m.index));
    const value = m[1].replace(/,/g, "");
    // "utilization from 82.1% to 84.6%" → one KPI whose value is the latest figure
    const prev = name !== "지표" ? out.find((k) => k.name.endsWith(name) || name.endsWith(k.name)) : undefined;
    if (prev) {
      prev.name = `${prev.name.length >= name.length ? prev.name : name} ${prev.value}${prev.unit ?? ""} →`;
      prev.value = value;
      prev.unit = m[2];
    } else out.push({ name, value, unit: m[2], chunkId });
  }
  return out;
}

const LABEL_PREFIX = /^(risk|issue|next steps?|next actions?|리스크|이슈|위험|다음 단계)\s*[:：]\s*/i;

/** Short lines without numbers or punctuation are section headings ("Next Steps", "현업 적용 계획"). */
function isHeading(line: string): boolean {
  return line.split(/\s+/).length <= 3 && !/\d/.test(line) && !/[.!?:：]$/.test(line) && !/[.!?]/.test(line);
}

function fromRows(input: ExtractInput): ExtractedActivity[] {
  const out: ExtractedActivity[] = [];
  for (const row of input.rows) {
    const v: Record<string, string> = {};
    for (const [h, value] of Object.entries(row.values)) {
      const key = mapHeader(h);
      if (key) v[key] = value;
    }
    if (!v.project || !(v.activity || v.description)) continue;
    const kpis: Kpi[] =
      v.kpiName && v.kpiValue ? [{ name: v.kpiName, value: v.kpiValue.replace(/,/g, ""), unit: v.kpiUnit, chunkId: row.chunkId }] : [];
    const chunk = input.chunks.find((c) => c.id === row.chunkId)!;
    out.push({
      activityDate: firstDate(v.date ?? "", new Date().getFullYear()) ?? null,
      projectName: v.project,
      department: v.department ?? null,
      category: v.category ?? null,
      activityType: v.activity ?? activityTypeOf(v.description ?? ""),
      description: v.description ?? v.activity!,
      achievement: v.achievement ?? null,
      issue: v.issue ?? null,
      risk: v.risk ?? null,
      nextAction: v.next ?? null,
      status: parseStatus(v.status),
      channel: "document",
      kpis,
      sourceRefs: [{ chunkId: row.chunkId, quote: chunk.text }],
      confidence: 0.95,
    });
  }
  return out;
}

interface Bucket {
  project: string;
  chunks: SourceChunk[];
  achievements: string[];
  issues: string[];
  risks: string[];
  next: string[];
  kpis: Kpi[];
  dates: string[];
  title?: string;
}

function fromText(input: ExtractInput): ExtractedActivity[] {
  const refYear = Number((input.documentDate ?? new Date().toISOString()).slice(0, 4));
  const docProject = detectProject(input.chunks.map((c) => c.text).join("\n"), input.fileName, input.knownProjects);
  const buckets = new Map<string, Bucket>();

  for (const chunk of input.chunks) {
    const project = detectProject(chunk.text, "", input.knownProjects) ?? docProject ?? projectFromFileName(input.fileName);
    if (!project) continue;
    const key = [...buckets.keys()].find((k) => sameProject(k, project)) ?? project;
    const b = buckets.get(key) ?? { project: key, chunks: [], achievements: [], issues: [], risks: [], next: [], kpis: [], dates: [] };
    const lines = chunk.text.split("\n").map(clean).filter(Boolean);
    let used = false;
    if (!b.title && lines[0] && !/^(subject|from|to|date)\s*:/i.test(lines[0])) b.title = lines[0];
    // On slides and PDF pages the first line is the heading, not a fact.
    const slideLike = input.sourceType === "ppt" || input.sourceType === "pdf";
    const body = slideLike && lines.length > 1 ? lines.slice(1) : lines;
    for (const raw of body) {
      if (/^(from|to|cc|date|prepared by)\s*:/i.test(raw)) continue;
      const subject = raw.match(/^subject\s*:\s*(.+)$/i)?.[1];
      if (subject) {
        b.title = clean(subject);
        continue;
      }
      if (isHeading(raw) || /^(과제|프로젝트|project)\s*(명)?\s*[:：]/i.test(raw)) continue;
      const line = raw.replace(LABEL_PREFIX, "");
      let isPlan = false;
      if (RISK_RE.test(raw)) (b.risks.push(line), (used = true));
      else if (ISSUE_RE.test(raw)) (b.issues.push(line), (used = true));
      else if (NEXT_RE.test(raw)) (b.next.push(line), (used = true), (isPlan = true));
      else if (ACHIEVEMENT_RE.test(raw)) (b.achievements.push(line), (used = true));
      // Planned figures are not results: no KPIs from next-action lines.
      const k = isPlan ? [] : kpisFrom(line, chunk.id);
      if (k.length) (b.kpis.push(...k), (used = true));
    }
    const d = firstDate(chunk.text, refYear);
    if (d) b.dates.push(d);
    if (used || b.chunks.length === 0) b.chunks.push(chunk);
    buckets.set(key, b);
  }

  const out: ExtractedActivity[] = [];
  for (const b of buckets.values()) {
    if (!b.achievements.length && !b.issues.length && !b.risks.length && !b.next.length && !b.kpis.length) continue;
    const all = [b.title ?? "", ...b.achievements, ...b.issues, ...b.next].join(" ");
    const channel: Channel = input.sourceType === "email" ? "email" : "document";
    out.push({
      activityDate: b.dates.sort().at(-1) ?? input.documentDate ?? null,
      projectName: b.project,
      department: null,
      category: null,
      activityType: activityTypeOf(all),
      description: (b.title ?? b.achievements[0] ?? b.next[0] ?? b.project).replace(`[${b.project}]`, "").trim(),
      achievement: b.achievements.slice(0, 3).join(" / ") || null,
      issue: b.issues.slice(0, 2).join(" / ") || null,
      risk: b.risks.slice(0, 2).join(" / ") || null,
      nextAction: b.next.slice(0, 2).join(" / ") || null,
      status: b.issues.some((l) => /지연|delay/i.test(l))
        ? "delayed"
        : b.achievements.some((l) => /완료|completed/i.test(l)) && !b.next.length
          ? "completed"
          : "in_progress",
      channel,
      kpis: b.kpis.slice(0, 6),
      sourceRefs: b.chunks.map((c) => ({ chunkId: c.id, quote: c.text.slice(0, 200) })),
      confidence: 0.7,
    });
  }
  return out;
}

// ── Report drafting ─────────────────────────────────────────────────────────

function sentence(s: string): string {
  const t = s.trim().replace(/\s*\/\s*/g, ", ");
  return /[.!?다요]$/.test(t) ? t : `${t}.`;
}

function groupByProject(activities: WorkActivity[]): [string, WorkActivity[]][] {
  const groups: [string, WorkActivity[]][] = [];
  for (const a of [...activities].sort((x, y) => x.activityDate.localeCompare(y.activityDate))) {
    const g = groups.find(([p]) => sameProject(p, a.projectName));
    if (g) g[1].push(a);
    else groups.push([a.projectName, [a]]);
  }
  return groups;
}

function draft(input: DraftInput): DraftItem[] {
  const limit = AUDIENCE_ITEM_LIMIT[input.audience];
  const groups = groupByProject(input.activities);
  const items: DraftItem[] = [];
  const add = (sectionKey: SectionKey, text: string, projectName: string | null, activityIds: string[]) =>
    items.push({ sectionKey, text, projectName, activityIds });

  const completed = groups.filter(([, list]) => list.some((a) => a.status === "completed"));
  const atRisk = groups.filter(([, list]) => list.some((a) => a.risk || a.issue || a.status === "delayed"));
  // No computed counts here: every number in the report must be traceable to a source.
  const names = (list: [string, WorkActivity[]][]) => list.map(([p]) => p).join(", ");
  add(
    "executive_summary",
    [
      `주요 과제: ${names(groups)}.`,
      completed.length ? `완료: ${names(completed)}.` : "",
      atRisk.length ? `이슈·리스크 보고: ${names(atRisk)}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    null,
    input.activities.map((a) => a.id),
  );
  for (const [project, list] of completed.slice(0, 2)) {
    const a = list.find((x) => x.status === "completed")!;
    add("executive_summary", sentence(`${project}: ${a.achievement ?? a.description}`), project, [a.id]);
  }
  for (const [project, list] of atRisk.slice(0, 1)) {
    const a = list.find((x) => x.risk || x.issue || x.status === "delayed")!;
    add("executive_summary", sentence(`주의 필요 — ${project}: ${a.risk ?? a.issue ?? a.description}`), project, [a.id]);
  }

  const achievements = input.activities.filter((a) => a.achievement);
  for (const a of achievements.slice(0, limit)) add("key_achievements", sentence(`[${a.projectName}] ${a.achievement}`), a.projectName, [a.id]);

  for (const [project, list] of groups.slice(0, Math.max(limit, 6))) {
    const last = list[list.length - 1];
    const status = list.some((a) => a.status === "completed") && last.status === "completed" ? "완료" : last.status === "delayed" ? "지연" : "진행 중";
    const detail = input.audience === "executive" ? last.description : list.map((a) => a.description).slice(-3).join(" / ");
    add("project_progress", sentence(`[${project}] ${status} · ${detail}`), project, list.map((a) => a.id));
  }

  const kpiActs = input.activities.filter((a) => a.kpis.length);
  for (const a of kpiActs.slice(0, limit)) {
    const ks = a.kpis.map((k) => `${k.name} ${k.value}${k.unit ?? ""}`).join(", ");
    add("kpi", sentence(`[${a.projectName}] ${ks}`), a.projectName, [a.id]);
  }

  const risky = input.activities.filter((a) => a.issue || a.risk);
  for (const a of risky.slice(0, limit)) {
    const parts = [a.issue && `이슈: ${a.issue}`, a.risk && `리스크: ${a.risk}`].filter(Boolean).join(" / ");
    add("issues_risks", sentence(`[${a.projectName}] ${parts}`), a.projectName, [a.id]);
  }

  const nexts = groups.map(([project, list]) => [project, [...list].reverse().find((a) => a.nextAction)] as const).filter(([, a]) => a);
  for (const [project, a] of nexts.slice(0, limit)) add("next_actions", sentence(`[${project}] ${a!.nextAction}`), project, [a!.id]);

  return items;
}

// ── Manual activity structuring ─────────────────────────────────────────────

function structureManual(text: string, known: string[], today: string): ManualActivityDraft {
  const refYear = Number(today.slice(0, 4));
  const channel: Channel = /전화|통화|phone|call/i.test(text)
    ? "phone"
    : /구두|지시|verbal/i.test(text)
      ? "verbal"
      : /현장|on-site|라인/i.test(text)
        ? "on_site"
        : /회의|미팅|meeting/i.test(text)
          ? "meeting"
          : /메일|email/i.test(text)
            ? "email"
            : /메신저|팀즈|teams|chat/i.test(text)
              ? "chat"
              : "other";
  const department = text.match(/([가-힣A-Za-z]+(?:팀|부|파트|센터))(?:과|와|에|의|\s)/)?.[1] ?? null;
  const knownHit = [...known].sort((a, b) => b.length - a.length).find((p) => text.toLowerCase().includes(p.toLowerCase()));
  const topic = text.match(/([A-Za-z0-9가-힣 ]{2,20}?)\s*관련/)?.[1]?.trim().split(/\s+/).at(-1);
  const nextAction =
    text.match(/(?:다음\s*주에?|향후|추후|이후)\s*([^.,]+?)(?:하기로|할 예정|예정)/)?.[1]?.trim() ??
    text.match(/([^.,]+?)(?:하기로 했|하기로 함|할 예정)/)?.[1]?.trim() ??
    null;
  const activityType = /협의|논의/.test(text) ? "협의" : /지시/.test(text) ? "지시 수행" : /대응|조치/.test(text) ? "현장 대응" : /점검|확인/.test(text) ? "점검" : "업무 수행";
  const project = knownHit ?? (topic ? (department ? `${department.replace(/팀|부|파트|센터$/, "")} ${topic}`.trim() : topic) : "미분류");
  return {
    activityDate: firstDate(text, refYear) ?? (/어제/.test(text) ? null : /오늘/.test(text) ? today : null),
    projectName: project,
    department,
    activityType: topic ? `${topic} ${activityType}` : activityType,
    description: text.trim(),
    channel,
    status: /완료|마쳤|끝냈/.test(text) ? "completed" : "in_progress",
    achievement: null,
    issue: null,
    risk: null,
    nextAction: nextAction ? nextAction.trim() : null,
  };
}

// ── Feedback revisions ──────────────────────────────────────────────────────

const STOPWORDS = new Set(["부분은", "부분", "조금", "더", "좀", "강조해주세요", "강조해", "주세요", "보다", "결과보다", "내용", "추가", "해주세요", "the", "and", "please"]);

function revise(input: ReviseInput): ProposalDraft[] {
  const tokens = input.comment
    .split(/[\s,.]+/)
    .map((t) => t.replace(/(은|는|이|가|을|를|의|에|도)$/, ""))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  const wantsPlan = /계획|적용|향후|next|plan/i.test(input.comment);
  const wantsRisk = /리스크|위험|이슈|risk/i.test(input.comment);
  const wantsResult = /성과|결과|실적|수치|kpi/i.test(input.comment) && !/결과보다/.test(input.comment);
  const acts = new Map(input.activities.map((a) => [a.id, a]));

  const targets = input.items.filter((i) => {
    const hay = `${i.projectName ?? ""} ${i.text}`.toLowerCase();
    return tokens.some((t) => hay.includes(t.toLowerCase())) && i.sectionKey !== "executive_summary";
  });

  const proposals: ProposalDraft[] = [];
  for (const t of targets) {
    const related = input.activities.filter((a) => t.projectName && sameProject(a.projectName, t.projectName));
    const cited = t.activityIds.map((id) => acts.get(id)).filter((a): a is WorkActivity => Boolean(a));
    const pool = [...cited, ...related.filter((a) => !cited.includes(a))];
    let addition: { text: string; ids: string[] } | null = null;
    if (wantsPlan) {
      const src = pool.filter((a) => a.nextAction);
      if (src.length) addition = { text: `향후 현업 적용 계획: ${src.map((a) => a.nextAction).join(" / ")}`, ids: src.map((a) => a.id) };
    } else if (wantsRisk) {
      const src = pool.filter((a) => a.risk || a.issue);
      if (src.length) addition = { text: `관련 리스크: ${src.map((a) => a.risk ?? a.issue).join(" / ")}`, ids: src.map((a) => a.id) };
    } else if (wantsResult) {
      const src = pool.filter((a) => a.achievement || a.kpis.length);
      if (src.length)
        addition = {
          text: `주요 성과: ${src.map((a) => a.achievement ?? a.kpis.map((k) => `${k.name} ${k.value}${k.unit ?? ""}`).join(", ")).join(" / ")}`,
          ids: src.map((a) => a.id),
        };
    }
    if (!addition) continue;
    if (t.text.includes(addition.text)) continue;
    const suggested =
      wantsPlan && t.sectionKey === "next_actions"
        ? sentence(`[${t.projectName}] ${addition.text.replace(/^향후 현업 적용 계획: /, "현업 적용 계획 — ")}`)
        : `${sentence(addition.text)} ${t.text}`;
    proposals.push({
      itemId: t.itemId,
      suggested,
      rationale: "팀장 Comment의 강조 요청을 반영해, 동일 과제의 Work Memory에 기록된 내용을 앞에 배치했습니다. 새로운 사실은 추가하지 않았습니다.",
      activityIds: [...new Set([...t.activityIds, ...addition.ids])],
    });
  }
  return proposals;
}

export class RuleEngine implements AiEngine {
  readonly kind = "demo" as const;
  readonly label = "Demo engine (rule-based)";

  async extractActivities(input: ExtractInput): Promise<ExtractedActivity[]> {
    const tabular = input.rows.length ? fromRows(input) : [];
    return tabular.length ? tabular : fromText(input);
  }

  async structureManualActivity(text: string, knownProjects: string[], today: string): Promise<ManualActivityDraft> {
    return structureManual(text, knownProjects, today);
  }

  async draftReport(input: DraftInput): Promise<DraftItem[]> {
    return draft(input);
  }

  async proposeRevisions(input: ReviseInput): Promise<ProposalDraft[]> {
    return revise(input);
  }
}
