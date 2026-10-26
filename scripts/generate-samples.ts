/**
 * Generates SYNTHETIC sample files for the demo scenario.
 * All names, numbers and e-mail addresses are fictional — no real company data.
 *
 *   npm run samples
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import PptxGenJS from "pptxgenjs";

const OUT = path.resolve("samples");

const HEADERS = ["Date", "Project", "Department", "Activity", "Description", "Status", "Achievement", "Issue", "Risk", "Next Action", "KPI", "Value", "Unit"];

type Row = (string | number | Date | null)[];

async function excel(file: string, rows: Row[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Synthetic sample generator";
  const ws = wb.addWorksheet("Progress");
  ws.addRow(HEADERS);
  ws.getRow(1).font = { bold: true };
  for (const r of rows) ws.addRow(r.map((v) => v ?? ""));
  ws.columns.forEach((c) => (c.width = 22));
  ws.getColumn(1).numFmt = "yyyy-mm-dd";
  await wb.xlsx.writeFile(path.join(OUT, file));
}

const d = (s: string) => new Date(`${s}T00:00:00Z`);

async function septemberStatus() {
  await excel("OPEX_Project_Status_2026-09.xlsx", [
    [d("2026-09-08"), "스마트 공정 모니터링", "생산기술팀", "설비 선정", "진동 모니터링 대상 설비 선정", "In Progress", "대상 설비 2라인 선정", null, null, "10월 진동센서 설치", null, null, null],
    [d("2026-09-15"), "AI CFT", "OPEX/DX팀", "심화교육 운영", "AI CFT 심화교육 2차수 운영", "In Progress", "교육 참여 인원 24명", null, null, "10월 현업 과제 결과발표", "교육 참여 인원", 24, "명"],
    [d("2026-09-18"), "MES 데이터 정합성 개선", "OPEX/DX팀", "현황 분석", "MES-ERP 생산실적 불일치 현황 분석", "In Progress", "불일치율 3.1% 확인", "원인 데이터 항목 다수", null, "10월 정합성 검증 로직 적용", "불일치율", 3.1, "%"],
    [d("2026-09-24"), "OPEX 원가절감", "OPEX/DX팀", "과제 착수", "하반기 원가절감 과제 착수", "Planned", null, null, null, "10월 원부자재 단가 분석", null, null, null],
  ]);
}

async function octoberStatus() {
  await excel("OPEX_Project_Status_2026-10.xlsx", [
    [d("2026-10-06"), "스마트 공정 모니터링", "생산기술팀", "센서 설치", "2라인 설비 진동센서 데이터 수집 체계 구축", "In Progress", "진동센서 12개소 설치 완료", null, "데이터 저장 용량 부족 우려", "11월 모니터링 대시보드 1차 오픈", "센서 설치", 12, "개"],
    [d("2026-10-10"), "MES 데이터 정합성 개선", "OPEX/DX팀", "검증 완료", "MES-ERP 생산실적 정합성 검증 로직 적용", "Completed", "불일치율 3.1%에서 0.4%로 개선", null, null, null, "불일치율", 0.4, "%"],
    [d("2026-10-13"), "OPEX 원가절감", "OPEX/DX팀", "단가 분석", "3분기 원부자재 구매 단가 분석", "Completed", "절감 후보 품목 5건 도출", null, null, "구매팀과 단가 협상 계획 수립", "절감 후보 품목", 5, "건"],
    [d("2026-10-20"), "스마트 공정 모니터링", "생산기술팀", "이상감지 PoC", "진동 이상감지 알고리즘 PoC 검토", "Delayed", null, "학습 데이터 라벨링 지연", "11월 대시보드 오픈 일정 지연 리스크", "라벨링 외주 검토", null, null, null],
    [d("2026-10-27"), "OPEX 원가절감", "OPEX/DX팀", "개선 실행", "포장재 규격 변경 시범 적용", "In Progress", "시범 라인 포장재 비용 4.2% 절감", null, null, "전 라인 확대 적용 검토", "포장재 비용 절감률", 4.2, "%"],
  ]);
}

async function aiCftDeck() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const title = { x: 0.6, y: 0.4, w: 12, h: 0.8, fontSize: 28, bold: true, color: "16243F" };
  const body = { x: 0.6, y: 1.5, w: 12, h: 5, fontSize: 18, color: "333333", valign: "top" as const };

  let s = pptx.addSlide();
  s.addText("AI CFT 심화교육 결과 보고", { ...title, y: 2.4, fontSize: 34 });
  s.addText("OPEX/DX팀 · 2026-10-16 · Synthetic sample", { ...body, y: 3.4, h: 0.6 });

  s = pptx.addSlide();
  s.addText("결과 요약", title);
  s.addText(
    [
      { text: "과제: AI CFT", options: { breakLine: true, bold: true } },
      { text: "심화교육 3차수 수료 완료 — 수료 인원 24명", options: { bullet: true, breakLine: true } },
      { text: "현업 과제 6건 결과발표 완료 (10월 16일)", options: { bullet: true, breakLine: true } },
      { text: "우수 과제 2건 선정", options: { bullet: true } },
    ],
    body,
  );

  s = pptx.addSlide();
  s.addText("현업 적용 계획", title);
  s.addText(
    [
      { text: "우수 과제 2건 현업 적용 예정 (11월 착수)", options: { bullet: true, breakLine: true } },
      { text: "적용 부서별 현업 담당자 지정 계획", options: { bullet: true, breakLine: true } },
      { text: "Risk: 현업 담당자 업무 부담으로 적용 일정 지연 우려", options: { bullet: true } },
    ],
    body,
  );
  await pptx.writeFile({ fileName: path.join(OUT, "AI_CFT_Result.pptx") });
}

async function nestingPdf() {
  const doc = new PDFDocument({ size: "A4", margin: 56 });
  const file = path.join(OUT, "Nesting_ML_Review_2026-10.pdf");
  const stream = (await import("node:fs")).createWriteStream(file);
  doc.pipe(stream);
  doc.font("Helvetica-Bold").fontSize(20).text("Nesting ML Feasibility Review");
  doc.moveDown(0.5).font("Helvetica").fontSize(11);
  doc.text("Project: Nesting ML");
  doc.text("Date: 2026-10-22");
  doc.text("Prepared by: OPEX/DX Team (synthetic sample)");
  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(14).text("Summary");
  doc.font("Helvetica").fontSize(11);
  doc.text("Reviewed ML-based nesting optimization for fabric cutting.");
  doc.text("PoC on 3 sample markers improved material utilization from 82.1% to 84.6%.");
  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(14).text("Issues and Risks");
  doc.font("Helvetica").fontSize(11);
  doc.text("Issue: CAD export format differs between plants.");
  doc.text("Risk: Model accuracy may drop on new fabric types.");
  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(14).text("Next Steps");
  doc.font("Helvetica").fontSize(11);
  doc.text("Next step: Extend PoC to 10 markers in November.");
  doc.text("Decision on pilot line planned for December.");
  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
}

async function serverEmail() {
  const body = `From: 이설비 <facility.lee@example.com>
To: 김데모 <demo.kim@example.com>
Date: 2026-10-23
Subject: [스마트 공정 모니터링] 데이터 저장 서버 증설 요청

김데모 님,

과제: 스마트 공정 모니터링

10월 진동센서 설치 이후 센서 데이터 저장 공간 사용률이 85%에 도달했습니다.
저장 용량 부족 이슈로 데이터 수집 주기를 줄이는 방안도 검토했으나 분석 정확도 저하가 우려됩니다.

IT팀과 11월 첫째 주 서버 증설 일정 협의 예정입니다.

※ 본 메일은 데모용 합성(Synthetic) 데이터입니다.
`;
  await fs.writeFile(path.join(OUT, "Email_Smart_Monitoring_2026-10-23.txt"), body, "utf8");
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  await septemberStatus();
  await octoberStatus();
  await aiCftDeck();
  await nestingPdf();
  await serverEmail();
  console.log(`Synthetic samples written to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
