/** Thrown by adapters whose real integration has not been provided yet (no API spec / credentials). */
export class NotConfiguredError extends Error {
  constructor(public readonly adapter: string, detail?: string) {
    super(`${adapter} 연동이 아직 구성되지 않았습니다.${detail ? ` ${detail}` : ""}`);
  }
}

export interface AdapterStatus {
  layer: string;
  name: string;
  state: "active" | "mock" | "not_configured";
  description: string;
}
