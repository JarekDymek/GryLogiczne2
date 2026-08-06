import { exportAssetSnapshot, normalizeAssetSnapshot, restoreAssetSnapshot, type AssetSnapshot } from "./assetsDatabase";
import { normalizeAppData } from "./storage";
import type { AppData } from "./types";

export interface FullBackup {
  format: "gry-logiczne2-full-backup";
  version: 1;
  createdAt: string;
  appData: AppData;
  assets: AssetSnapshot;
}

export async function exportFullBackup(data: AppData): Promise<string> {
  const backup: FullBackup = {
    format: "gry-logiczne2-full-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    appData: normalizeAppData(data),
    assets: await exportAssetSnapshot(),
  };
  return JSON.stringify(backup, null, 2);
}

export function parseFullBackup(rawValue: string): FullBackup {
  const parsed = JSON.parse(rawValue) as Partial<FullBackup>;
  if (parsed.format !== "gry-logiczne2-full-backup" || parsed.version !== 1 || !parsed.appData) {
    throw new Error("To nie jest pełna kopia aplikacji.");
  }
  return {
    format: "gry-logiczne2-full-backup",
    version: 1,
    createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    appData: normalizeAppData(parsed.appData),
    assets: normalizeAssetSnapshot(parsed.assets),
  };
}

export async function restoreFullBackup(backup: FullBackup): Promise<number> {
  return restoreAssetSnapshot(backup.assets);
}
