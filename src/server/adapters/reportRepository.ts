import type { Report } from "@/domain/types";
import { REPORT_TYPE_LABELS } from "@/domain/constants";
import { NotConfiguredError } from "./errors";

export interface ReportRepositoryAdapter {
  readonly name: string;
  archive(report: Report): Promise<{ path: string }>;
}

/** Repository path convention: YYYY / Type / Title */
export function repositoryPath(report: Pick<Report, "periodStart" | "type" | "title">): string {
  return `${report.periodStart.slice(0, 4)}/${REPORT_TYPE_LABELS[report.type]}/${report.title}`;
}

/** Keeps final reports inside this app (Repository screen). */
export class InternalRepositoryAdapter implements ReportRepositoryAdapter {
  readonly name = "Internal Repository";
  async archive(report: Report) {
    return { path: repositoryPath(report) };
  }
}

/** Target: report.taekwang.com. No API or access method has been provided yet, so nothing is sent. */
export class TaekwangRepositoryAdapter implements ReportRepositoryAdapter {
  readonly name = "report.taekwang.com";
  async archive(): Promise<{ path: string }> {
    throw new NotConfiguredError(this.name, "API 명세와 접근 방법이 제공되면 구현합니다.");
  }
}
