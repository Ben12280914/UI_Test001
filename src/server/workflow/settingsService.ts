import { promises as fs } from "node:fs";
import path from "node:path";
import type { Settings } from "@/domain/types";
import { dataDir } from "../config";
import { emptyStore } from "../store/defaults";
import { getStore } from "../store/jsonFileStore";

export async function getSettings(): Promise<Settings> {
  return (await getStore().read()).settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return getStore().update((d) => {
    if (patch.userName !== undefined) d.settings.userName = patch.userName.trim() || d.settings.userName;
    if (patch.department !== undefined) d.settings.department = patch.department.trim() || d.settings.department;
    if (patch.reviewerName !== undefined) d.settings.reviewerName = patch.reviewerName.trim() || d.settings.reviewerName;
    if (patch.monthlyLeadDays !== undefined) {
      const n = Math.round(Number(patch.monthlyLeadDays));
      if (Number.isFinite(n) && n >= 0 && n <= 20) d.settings.monthlyLeadDays = n;
    }
    return d.settings;
  });
}

/** Wipe Work Memory, reports and uploaded files (settings are kept). */
export async function resetAllData(): Promise<void> {
  const store = getStore();
  const { settings } = await store.read();
  await store.reset({ ...emptyStore(), settings: { ...settings, projects: [] } });
  await fs.rm(path.join(dataDir(), "uploads"), { recursive: true, force: true });
}
