import { NotConfiguredError } from "./errors";

export interface IncomingFile {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  origin: string;
}

/**
 * Where documents come from. The MVP only has manual upload (pushed through the Data Space UI);
 * SharePoint/OneDrive collectors will implement `pull()`.
 */
export interface DocumentSourceAdapter {
  readonly name: string;
  readonly mode: "push" | "pull";
  pull(since: string): Promise<IncomingFile[]>;
}

export class ManualUploadSource implements DocumentSourceAdapter {
  readonly name = "Data Space upload";
  readonly mode = "push" as const;
  async pull(): Promise<IncomingFile[]> {
    return []; // files arrive through POST /api/documents
  }
}

export class SharePointSource implements DocumentSourceAdapter {
  readonly name = "SharePoint / OneDrive";
  readonly mode = "pull" as const;
  async pull(): Promise<IncomingFile[]> {
    throw new NotConfiguredError(this.name, "사내 Microsoft 365 연동 승인 후 구현합니다.");
  }
}
