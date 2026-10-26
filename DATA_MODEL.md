# Data Model

타입 정의: `src/domain/types.ts`. 저장: `DATA_DIR/store.json` (Store interface 뒤에 있어 DB로 교체 가능).

```
SourceDocument 1 ── n SourceChunk 1 ── n SourceRef n ── 1 WorkActivity
                                                         │
                                       ReportItem.activityIds (n:n)
                                                         │
Report 1 ── n ReportSection 1 ── n ReportItem
   ├── versions[]     (ReportVersion: 0.1 AI Draft → 0.2 User Reviewed → 0.3 Manager Feedback Applied → 1.0 Final)
   ├── proposals[]    (FeedbackProposal: Original → Feedback → Suggested)
   ├── approval       (ApprovalRecord: 메모결재 상태 + Comment)
   └── projectSnapshots[] (이전 보고서 비교용)

TriggerEvent n ── 1 ReportingCycle 1 ── 0..1 Report
```

## SourceDocument — 업로드된 원본 자료

| Field | 설명 |
|---|---|
| id, fileName, mimeType, size | 파일 정보 |
| sourceType | `excel` · `ppt` · `pdf` · `text` · `email` · `manual` |
| storedPath | `DATA_DIR` 기준 원본 저장 경로 |
| documentDate | 문서 날짜 (헤더 / 파일명 / 본문에서 추출, 없으면 비어 있음) |
| status | `uploaded` → `extracting` → `extracted` / `failed` |
| extractedBy | `ai` (Claude) / `rule` (Demo 엔진) |
| chunkCount, activityCount | 집계 |

## SourceChunk — 인용 가능한 원본 단위

| Field | 설명 |
|---|---|
| id | `{documentId}_c{n}` |
| locator | 사람이 읽는 위치: `Sheet 'Progress' · Row 5`, `Slide 3`, `Page 2`, `Email body ¶2` |
| text | Chunk 원문 |

## WorkActivity — Reporting Memory의 단위

| Field | 설명 |
|---|---|
| activityDate | 업무 수행일 (원문에 없으면 문서 날짜 + flag) |
| projectName, department, category | 분류 |
| activityType, description | 무엇을 했는가 |
| achievement, issue, risk, nextAction | 보고서 섹션의 재료 |
| status | `planned` · `in_progress` · `completed` · `delayed` · `on_hold` |
| channel | `document` · `email` · `phone` · `meeting` · `verbal` · `on_site` · `chat` · `other` |
| kpis[] | `{ name, value, unit, chunkId }` — value는 원문에 있는 숫자만 허용 |
| sourceType, sourceDocumentId, sourceFile | 출처 |
| sourceRefs[] | `{ documentId, chunkId, locator, quote }` — quote는 원문 그대로 |
| confidence | 0–1 (0.6 미만이면 보고서에서 Review Required) |
| extractedBy | `ai` · `rule` · `user` |
| flags[] | Guardrail 기록 (예: "KPI 제거: Source에서 확인되지 않음", "중복 업무") |
| duplicateOf | 중복으로 판정된 경우 원본 Activity id (보고서 생성에서 제외) |

수기 입력(Add Missing Activity)은 `sourceType=manual`, `sourceRefs=[]`, `extractedBy=user`로 저장됩니다.

## Report

| Field | 설명 |
|---|---|
| type | `weekly` · `monthly` · `quarterly` · `annual` · `custom` |
| periodStart, periodEnd | 보고 기간 |
| audience | `working` · `team_leader` · `executive` (섹션당 항목 수 / 상세도) |
| status | `DRAFT` → `READY_FOR_REVIEW` → `SUBMITTED` → `IN_REVIEW` → `CHANGES_REQUESTED` / `APPROVED` → `ARCHIVED` |
| sections[] | 6개 고정 섹션 (Executive Summary … Next Actions) |
| ignoredActivityIds | Missing Evidence에서 [Ignore] 한 Activity |
| generatedBy | `ai` / `rule` |
| cycleId | 연결된 ReportingCycle |
| archive | `{ adapter, path, archivedAt }` — 예: `2026/Monthly/2026-10 OPEX/DX팀 Monthly Report` |

### ReportItem

| Field | 설명 |
|---|---|
| text | 보고서 문장 |
| activityIds | 근거 Activity (Source 추적의 시작점) |
| origin | `ai` · `user` · `missing_evidence` · `feedback` |
| validation | `{ status, reasons[], checkedAt }` — 코드가 계산 (`src/server/validation/validator.ts`) |
| verifiedBy, verifiedAt | 사용자 확인 기록. 문장이 바뀌면 해제 |

### FeedbackProposal

`commentText`(팀장 Comment) · `itemId` · `original` · `suggested` · `rationale` · `activityIds` · `status`(`pending` / `accepted` / `rejected` / `edited`) · `finalText`

### ApprovalRecord

`externalRef`(결재 번호) · `adapter` · `submitter` · `reviewer` · `submittedAt` · `status` · `comments[]` · `round`(상신 차수)

## TriggerEvent / ReportingCycle

- **TriggerEvent**: `type`(`GPS_ARRIVAL` · `REPORTING_SCHEDULE` · `MANUAL`), `source`(`power_automate` · `scheduler` · `demo`), `payload`
- **ReportingCycle**: 하나의 보고 주기 (예: 2026-10 Monthly). `state`(`notified` · `started` · `snoozed` · `skipped`), `snoozeUntil`, `reportId`
  - Trigger가 들어오면 그 날짜에 마감이 다가온 보고가 있을 때만 Cycle을 만들고 알림을 띄웁니다 (`src/server/workflow/schedule.ts`).
