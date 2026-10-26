# 이지 · AI Reporting Agent

> **Work → Memory → Report**
> 보고서를 작성하는 조직에서, 업무 데이터가 보고서를 만드는 조직으로.

**이지**는 TKG(티케이지)에서 "티케"를 뺀 이름으로, 제조업 OPEX/DX 조직의 정기 보고를 위한 End-to-End AI Reporting Agent입니다. AI CFT Practical Bootcamp 결과물로 만들었습니다.
Excel · PPT · PDF · Email에 흩어진 업무 기록을 Work Memory에 쌓아 두고, 보고 시점이 되면 먼저 알려 줍니다. 근거가 연결된 보고서 초안을 만들고, Source 검증과 메모결재를 거쳐 Repository에 보관합니다.

이지는 "파일 올리고 질문하는 RAG 챗봇"이 아니라 아래 **Reporting Workflow**를 중심으로 동작합니다.

```
01 출근/Trigger → 02 인지 → 03 확인 → 04 실행 → 05 검토 → 06 보고 → 07 REVIEW → 08 완성
   (GPS·일정)    (먼저 알림)  (수집·이해)  (초안 생성)  (Source 검증) (메모결재)  (피드백 반영)  (Final·보관)
```

AI/Automation이 Trigger → 수집 → 기억 → 정리 → 작성 → 검증 → 피드백 반영 → 축적을 맡고,
사람은 **판단 → Review → 승인**에 집중합니다.

---

## 빠른 시작

```bash
npm install
cp .env.example .env.local      # 값 채우기 (아래 참고)
npm run seed                    # 데모 기준 데이터: 9월 월간보고(승인·보관 상태)
npm run dev                     # http://localhost:3000
```

사내 서버 운영:

```bash
npm run build
npm start                       # 기본 포트 3000
```

- Node.js 20.18 이상이 필요합니다.
- 외부 DB는 필요 없습니다. 데이터는 `DATA_DIR`(기본 `./data`)의 `store.json`과 `uploads/`에 저장됩니다.
- 외부로 나가는 통신은 **Claude API 호출 하나뿐**입니다.

### 환경 변수 (`.env.local`)

| 변수 | 설명 |
|---|---|
| `AI_MODE` | `live` = Claude 사용, `demo` = 규칙 기반 엔진 (네트워크 없음, 발표용으로 안정적) |
| `ANTHROPIC_API_KEY` | Claude API 키. 코드에 넣지 말고 이 파일에만 둡니다 |
| `ANTHROPIC_BASE_URL` | 사내 LLM Gateway가 있으면 지정 (없으면 비움) |
| `ANTHROPIC_MODEL` | 기본 `claude-opus-5-5` |
| `ANTHROPIC_FALLBACKS` | `default` (서버측 refusal fallback 사용) / `off` (Gateway가 beta 헤더를 거부할 때) |
| `LLM_HTTPS_PROXY` | 사내 Proxy를 거쳐야 할 때만 지정. LLM 호출에만 적용됩니다 |
| `DATA_DIR` | 데이터 저장 위치 |
| `TRIGGER_WEBHOOK_SECRET` | 출근 Trigger Webhook 비밀값. 비어 있으면 Webhook은 꺼져 있습니다 |

`AI_MODE=live`인데 키가 없으면 자동으로 Demo 엔진으로 동작하고, 화면 좌측 하단과 Settings에 그 사실이 표시됩니다.

---

## 데모 시나리오 (Bootcamp 발표용)

1. **Settings → 데모 시나리오 초기화**를 누르면 9월 월간보고가 승인·보관된 상태로 준비됩니다.
2. **Dashboard → `GPS 출근 Trigger 시뮬레이션`** (SCENE 1): "10월 월간보고 작성 시점입니다" 알림이 뜹니다.
3. **보고서 준비 시작** → Data Space에서 **10월 샘플 모두 업로드** (SCENE 2–4). 원본 위치가 연결된 Activity가 추출됩니다.
4. **Report Generator**에서 Monthly / Team Leader를 고르고 **Generate Report** (SCENE 5–7).
5. **Validation**에서 문장을 클릭해 Source Evidence를 확인합니다 (SCENE 8). Report Preview 탭에서 슬라이드 형태로, Compare 탭에서 9월 대비 NEW · COMPLETED · DELAYED/RISK를 볼 수 있습니다.
6. **Work Memory → Add Missing Activity**에 `예시 문장 넣기` → **AI로 구조화** → 저장 (SCENE 9). 보고서로 돌아가면 *Potential Missing Activities*에 나타나므로 **Add to Report**를 누릅니다.
7. **Source Found 일괄 확인**을 누르고, 수기 입력 항목은 개별 확인 → **Validation 완료** (SCENE 10).
8. **메모결재 상신** (SCENE 11) → Mock 팀장 화면에서 **열람 → 수정 요청** (SCENE 12).
9. **Apply Feedback with AI** → 제안을 **Accept** (SCENE 13–14) → **수정본 재상신** → **승인**.
10. **Final 확정 · Repository 저장** (SCENE 15–16). Version History에 v0.1 → v0.2 → v0.3 → v1.0이 남습니다.

샘플 파일(`samples/`)은 모두 **합성(Synthetic) 데이터**입니다. `npm run samples`로 다시 만들 수 있습니다.

---

## 신뢰성 원칙

- **Source 추적:** 보고서 문장 → Work Activity → 원본 Chunk(시트·행 / 슬라이드 / 페이지 / 메일 단락)까지 클릭으로 따라갈 수 있습니다.
- **검증은 코드가 합니다:** `VERIFIED` · `SOURCE FOUND` · `REVIEW REQUIRED` · `NO SOURCE`는 LLM이 아니라 `src/server/validation/validator.ts`가 계산합니다.
  - 근거 Activity가 없으면 `NO SOURCE`입니다.
  - 문장 속 수치가 원문에 없거나, 수기 입력만 근거로 하거나, 추출 신뢰도가 낮으면 `REVIEW REQUIRED`입니다.
  - `NO SOURCE` 항목은 Verified로 바꿀 수 없습니다.
- **Guardrail:** AI 추출 결과 중 존재하지 않는 Chunk 인용, 원문에 없는 KPI 수치, 근거 없는 Activity는 저장 전에 제거됩니다. 제거 기록은 `flags`에 남습니다.
- **사람이 결정합니다:**
  - 피드백 반영은 제안(Original → Suggested)으로만 만들어지고, Accept / Reject / Edit은 사용자가 정합니다.
  - 팀장 승인(APPROVED) 없이는 Final 처리와 Repository 저장이 서버에서 거부됩니다.

## 출근 Trigger 연결 방법

이지는 `POST /api/triggers/webhook` 하나만 열어 둡니다 (`x-trigger-secret` 헤더 필요, 형식은 Settings 화면 참고). 어떤 도구가 호출하든 같은 흐름으로 동작합니다.

| 방법 | 장점 | 주의 |
|---|---|---|
| **기존 Power Automate GPS Flow** | 이미 구현되어 있음. HTTP 액션의 URL만 바꾸면 됨 | Power Automate(클라우드)가 사내망 서버에 닿아야 함 (On-premises data gateway 또는 외부 공개 엔드포인트 필요) |
| **Windows 로그온 작업** (`scripts/triggers/windows-logon-trigger.ps1`) | PA 불필요. GPS 권한 불필요. 사내망 PC에서 실행되므로 네트워크 문제 없음 | "사내망 PC 로그온 = 출근"으로 간주 |
| **iOS 단축어 · 개인용 자동화 "도착"** | 실제 GPS 기반, PA 불필요 | 휴대폰이 사내 Wi-Fi/VPN에 연결되어야 서버에 닿음. iOS 설정에 따라 실행 확인 알림이 뜰 수 있음 |
| **앱 내 일정 Trigger** | 별도 설정 없음 | 사용자가 이지를 열었을 때만 동작 |

## 문서

- [ARCHITECTURE.md](ARCHITECTURE.md): Layer 구조, Adapter, 사내 구동
- [DATA_MODEL.md](DATA_MODEL.md): 데이터 모델
- [TODO.md](TODO.md): 구현 Task와 다음 단계

## 개발

```bash
npm run typecheck     # TypeScript
npm test              # 8-Step 시나리오 end-to-end 테스트 (Demo 엔진, 임시 DATA_DIR)
```

## 보안 · 데이터

- Credential은 `.env.local`에만 둡니다 (`.gitignore` 처리됨).
- 실제 회사 Email/Data는 Demo Data로 사용하지 않습니다.
- MVP에는 로그인/SSO가 없습니다. 사내망 내부 배포를 전제로 하며, 운영 전에 사내 SSO 연동이 필요합니다.
- 실제 업무 자료를 `live` 모드로 처리하기 전에 사내 보안 정책(외부 LLM API 사용 승인)을 확인하세요.
