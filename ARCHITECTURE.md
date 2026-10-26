# Architecture

이지(AI Reporting Agent)는 **Work → Memory → Report** 흐름을 5개 Layer로 나눠 구현합니다.
사내 API가 없는 연동(Power Automate, 메모결재, report.taekwang.com)은 모두 **Adapter Interface + Mock 구현**으로 분리되어 있어,
실제 API가 생기면 Adapter만 교체하면 됩니다. UI와 Core Logic은 바뀌지 않습니다.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Frontend (Next.js App Router, src/app + src/components)              │
│  Dashboard · Data Space · Work Memory · Report Generator ·           │
│  Validation · Approval · Repository · Settings                       │
├──────────────────────────────────────────────────────────────────────┤
│ Application / Workflow Layer (src/server/workflow)                   │
│  cycleService (8-Step 상태) · ingestService · memoryService ·        │
│  reportService · approvalService · repositoryService · triggerService│
├──────────────────────────────────────────────────────────────────────┤
│ AI Service Layer (src/server/ai)                                     │
│  AiEngine interface ─┬─ ClaudeEngine (live, @anthropic-ai/sdk)       │
│                      └─ RuleEngine   (demo, deterministic)           │
│  + guardrails: 인용 검증 · 수치 검증 · 존재하지 않는 ID 제거          │
├──────────────────────────────────────────────────────────────────────┤
│ Data / Work Memory Layer (src/server/store, src/server/parsing,      │
│                           src/server/validation)                     │
│  Store interface ── JsonFileStore (DATA_DIR/store.json)              │
│  Parsers: xlsx · pptx · pdf · text · email → SourceChunk(+locator)   │
│  Validator · Comparator · MissingEvidenceDetector (deterministic)    │
├──────────────────────────────────────────────────────────────────────┤
│ Integration Adapter Layer (src/server/adapters)                      │
│  TriggerAdapter · DocumentSourceAdapter · EmailAdapter ·             │
│  ApprovalAdapter · ReportRepositoryAdapter                           │
│  (현재: Mock / Internal 구현, 외부 연동은 "Not configured" stub)      │
└──────────────────────────────────────────────────────────────────────┘
```

## 핵심 설계 원칙

### 1. Source 추적은 추출 시점에 결정된다
업로드된 파일은 먼저 **SourceChunk**로 쪼개지고, 각 Chunk는 사람이 읽을 수 있는 위치(`locator`)를 가집니다.

| 형식 | Chunk 단위 | locator 예 |
|---|---|---|
| Excel | 시트의 한 행 | `Sheet 'Progress' · Row 5` |
| PowerPoint | 슬라이드 1장 | `Slide 3` |
| PDF | 페이지 1장 | `Page 2` |
| Email (.eml/.txt) | 헤더 + 본문 단락 | `Email body ¶2` |
| Text | 빈 줄로 나눈 단락 | `Paragraph 4` |

AI가 만든 WorkActivity는 반드시 `sourceRefs[]`(chunkId + 인용문)를 가지며,
보고서의 각 문장(ReportItem)은 `activityIds[]`를 가집니다.
따라서 **보고서 문장 → Activity → Chunk → 원본 파일 위치**까지 클릭으로 따라갈 수 있습니다.

### 2. 검증은 LLM이 아니라 코드가 한다
`src/server/validation/validator.ts`는 결정적(deterministic) 규칙으로 상태를 계산합니다.

| Status | 조건 |
|---|---|
| `NO_SOURCE` | 인용한 Activity가 없거나 존재하지 않음 |
| `REVIEW_REQUIRED` | 문장 속 수치가 Source에 없음 / 수기 입력(근거 문서 없음)만 인용 / 신뢰도 낮음 |
| `SOURCE_FOUND` | 근거 문서가 있고 수치 대조 통과 |
| `VERIFIED` | 사용자가 Source를 확인하고 승인 (NO_SOURCE는 Verified 불가) |

문장 내용이 바뀌면(편집, 피드백 반영) 검증 상태는 다시 계산되고 Verified는 해제됩니다.

### 3. AI는 제안하고, 사람이 결정한다
- AI Draft는 항상 `DRAFT` 상태로 생성됩니다.
- 팀장 피드백 반영은 **Original → Feedback → Suggested Revision** 제안으로만 생성되며, 사용자가 Accept/Reject/Edit 해야 반영됩니다.
- `APPROVED`(팀장 승인) 없이는 Final(v1.0) 처리와 Repository 저장이 서버에서 거부됩니다.

### 4. Live / Demo 이중 엔진
`AI_MODE=live`이면 Claude(`claude-opus-5-5`)를 호출하고, `demo`이면 규칙 기반 엔진을 사용합니다.
두 엔진은 같은 `AiEngine` 인터페이스를 구현하므로, 발표 중 네트워크 문제가 생겨도 `demo`로 전환하면 시나리오가 끊기지 않습니다.
Live 엔진의 출력도 동일한 Guardrail(존재하지 않는 chunk/activity ID 제거, 원문에 없는 수치 제거)을 통과해야 저장됩니다.

## 사내 구동 (On-premise)

- 단일 Node.js 프로세스(`npm run build && npm start`)로 구동, 외부 DB 불필요.
- 데이터는 `DATA_DIR`(기본 `./data`)에 저장: `store.json` + `uploads/`.
- 외부로 나가는 통신은 **Claude API 호출 1종**뿐입니다.
  - 사내 LLM Gateway가 있으면 `ANTHROPIC_BASE_URL`로 지정
  - 사내 Proxy가 필요하면 `LLM_HTTPS_PROXY`로 지정 (undici ProxyAgent, LLM 호출에만 적용)
- 인증/SSO는 MVP 범위 밖입니다. 사내망 내부 배포를 전제로 하며, 운영 전 사내 SSO 연동이 필요합니다.

## Integration Adapters

| Adapter | 현재 구현 | 향후 교체 대상 |
|---|---|---|
| `TriggerAdapter` | `/api/triggers/webhook` (secret header) + 데모 시뮬레이터 + 내부 Scheduler | GPS → Power Automate HTTP action |
| `DocumentSourceAdapter` | 수동 업로드 (Data Space) | SharePoint / OneDrive |
| `EmailAdapter` | `.eml` / Email export `.txt` 업로드 파싱 | Outlook (Graph API) |
| `ApprovalAdapter` | `MockApprovalAdapter` (팀장 시점 시뮬레이션 포함) | 사내 메모결재 API |
| `ReportRepositoryAdapter` | `InternalRepositoryAdapter` (store.json) / `TaekwangRepositoryAdapter` (미구성 stub) | report.taekwang.com |

존재하지 않는 Endpoint나 인증 방식을 추정해서 구현하지 않습니다. 외부 Adapter stub은 호출 시 `NotConfiguredError`를 던지며 UI는 "연동 예정"으로 표시합니다.

## 8-Step ↔ 시스템 상태 매핑

| Step | 의미 | 완료 조건 (ReportingCycle 기준) |
|---|---|---|
| 01 출근/Trigger | 이벤트 수신 | TriggerEvent 존재 |
| 02 인지 | 알림 확인 | 사용자가 [보고서 준비 시작] |
| 03 확인 | 자료 수집·이해 | 기간 내 WorkActivity ≥ 1 |
| 04 실행 | 초안 생성 | Report 생성 |
| 05 검토 | Source 검증 | Report `READY_FOR_REVIEW` 이상 |
| 06 보고 | 메모결재 상신 | `SUBMITTED` 이상 |
| 07 REVIEW | 팀장 피드백 반영 | `APPROVED` |
| 08 완성 | Final + Repository | `ARCHIVED` |

## 폴더 구조

```
src/
  app/                    # 화면(Server Components) + API Route Handlers
    api/                  # triggers, documents, activities, reports, approval, repository, settings
  components/             # UI (layout, workflow stepper, report preview, badges …)
  domain/                 # 타입, 상수, 순수 함수 (기간 계산, 상태 매핑)
  server/
    adapters/             # Integration Adapter Layer
    ai/                   # AiEngine, ClaudeEngine, RuleEngine, prompts, guardrails
    parsing/              # 파일 → SourceChunk
    store/                # Store interface + JsonFileStore
    validation/           # validator, comparator, missing evidence
    workflow/             # Application services
scripts/                  # 합성 샘플 파일 생성, 데모 데이터 seed
samples/                  # 합성(Synthetic) 샘플 파일 — 실제 회사 데이터 아님
tests/                    # 결정적 로직 단위 테스트
```
