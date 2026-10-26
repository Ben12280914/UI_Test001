import type { StoreData } from "@/domain/types";

export const STORE_VERSION = 1;

export function emptyStore(): StoreData {
  return {
    version: STORE_VERSION,
    settings: {
      userName: "김데모",
      department: "OPEX/DX팀",
      reviewerName: "박팀장",
      monthlyLeadDays: 7,
      projects: [],
    },
    documents: [],
    chunks: [],
    activities: [],
    reports: [],
    triggers: [],
    cycles: [],
  };
}
