# TODO — 구현 Task

## ✅ 완료 (MVP)

### 기반
- [x] 프로젝트 구조 / Layer 분리 (Frontend · Workflow · AI · Data · Adapter)
- [x] README / ARCHITECTURE / DATA_MODEL
- [x] JSON 파일 Store (Store interface로 DB 교체 가능)
- [x] 합성(Synthetic) 샘플 생성기 · 데모 seed (9월 보고서 실제 파이프라인으로 생성)

### P0
- [x] Dashboard: 파이프라인(TRIGGERED → FINAL), 8-Step Journey, 실데이터 기반 KPI (데이터 없으면 "—")
- [x] Trigger Layer: Webhook(`/api/triggers/webhook`, secret), 데모 시뮬레이터, 보고 일정 계산
- [x] Proactive Notification: [보고서 준비 시작] [내일 다시 알림] [이번 달 제외]
- [x] Multi-file Upload (Drag & Drop): xlsx · pptx · pdf · txt · eml
- [x] Document → Chunk(원본 위치) → Activity 추출 (Claude / Rule 엔진)
- [x] Work Memory 조회 · 필터 · 수정 · 삭제, 중복 업무 탐지
- [x] Add Missing Activity (자연어 → 구조화 → 확인 후 저장)
- [x] Weekly / Monthly / Quarterly / Annual / Custom + Audience 선택
- [x] Report Draft Generation (6개 섹션, 모든 문장에 근거 Activity 연결)
- [x] Source Reference: 문장 → Activity → 원본 Chunk (인용문 하이라이트) → 원본 다운로드
- [x] Validation Status (코드 기반): VERIFIED / SOURCE FOUND / REVIEW REQUIRED / NO SOURCE
- [x] Report Preview (16:9 슬라이드, 인쇄/PDF)
- [x] Mock 메모결재 (상신 · 열람 · 수정 요청 · 승인, 재상신)
- [x] Repository (연도/유형 트리, Period · Type · Project · Department · Keyword · Status 검색)
- [x] 8-Step Workflow 표시 (전 화면 상단)

### P1
- [x] Previous Report Comparison (NEW / PROGRESS / COMPLETED / DELAYED·RISK / UNCHANGED)
- [x] Missing Evidence Detection (Add to Report / Ignore)
- [x] Audience별 요약 수준
- [x] Manager Feedback → AI Revision (Accept / Reject / Edit)
- [x] Version History (v0.1 AI Draft → v0.2 User Reviewed → v0.3 Manager Feedback Applied → v1.0 Final, 버전 간 변경 표시)

### 검증
- [x] `npm test`: 8-Step 시나리오 end-to-end (Trigger → … → Repository)
- [x] Playwright로 데모 16개 Scene 브라우저 실행 확인

## ⏭ 다음 단계

### Bootcamp 전 확인
- [ ] 실제 `ANTHROPIC_API_KEY`로 `AI_MODE=live` 리허설 (추출 · 초안 · 피드백 반영 품질 확인)
- [ ] 사내 Proxy / Gateway 환경에서 Claude 호출 확인 (`LLM_HTTPS_PROXY`, `ANTHROPIC_BASE_URL`)
- [ ] 사내 서버 배포 (`npm run build && npm start`, 프로세스 관리자 등록)
- [ ] 외부 LLM API 사용에 대한 사내 보안 승인 확인

### P2 — Future Integration
- [ ] 출근 Trigger 실제 연결: 기존 PA Flow의 HTTP 액션 → `/api/triggers/webhook` (또는 `scripts/triggers/windows-logon-trigger.ps1`)
- [ ] Cloud Scheduler / 상시 실행 Agent로 알림 (현재: Trigger 수신 시 + 앱 내 일정)
- [ ] Outlook 자동 수집 (`EmailAdapter`), SharePoint / OneDrive 자동 수집 (`DocumentSourceAdapter`)
- [ ] Teams / Meeting Transcript 수집
- [ ] 사내 메모결재 API (`ApprovalAdapter`)
- [ ] report.taekwang.com 연동 (`ReportRepositoryAdapter`)
- [ ] 회사 PPT Template Export (Report Preview 섹션 구조 → .pptx)
- [ ] 사내 SSO / 사용자별 데이터 분리
- [ ] Store → 사내 DB (다중 사용자 동시 사용 시)

## 📌 나중에 볼 것

- [ ] Instagram 릴스 내용 Jarvis에서 돌려보기 (집 PC 원격제어 켠 뒤): https://www.instagram.com/reel/DfUHf7ay8JH/
