import { NotConfiguredError } from "./errors";
import type { IncomingFile } from "./documentSource";

/** Email collection. MVP: users upload .eml or an exported text file; Outlook collection comes later. */
export interface EmailAdapter {
  readonly name: string;
  fetchSince(since: string): Promise<IncomingFile[]>;
}

export class EmailExportUpload implements EmailAdapter {
  readonly name = "Email export (.eml / .txt) upload";
  async fetchSince(): Promise<IncomingFile[]> {
    return [];
  }
}

export class OutlookEmailAdapter implements EmailAdapter {
  readonly name = "Outlook";
  async fetchSince(): Promise<IncomingFile[]> {
    throw new NotConfiguredError(this.name, "Microsoft Graph 권한 승인 후 구현합니다.");
  }
}
