import { exportAssetSnapshot, normalizeAssetSnapshot, restoreAssetSnapshot, type AssetSnapshot } from "./assetsDatabase";
import { importAppData, normalizeAppData } from "./storage";
import type { AppData } from "./types";
import {
  defaultProgress,
  highestUnlockedFromCompletedLevels,
  loadStoredProgress,
  normalizeProgress,
  saveStoredProgress,
  type StoredProgress,
} from "../games/t-puzzle/progress";

export interface FullBackup {
  format: "gry-logiczne2-full-backup";
  version: 1;
  createdAt: string;
  appData: AppData;
  progress: StoredProgress;
  assets: AssetSnapshot;
}

function progressFromAppData(data: AppData): StoredProgress {
  const profile =
    data.profiles.find((entry) => entry.id === data.activeProfileId) ?? data.profiles[0];
  const completedLevels = Array.from(new Set(
    (profile?.completedTargets ?? []).flatMap((targetKey) => {
      const match = /^[a-z-]+-stage-(\d+):/.exec(targetKey);
      return match ? [Math.max(0, Number(match[1]) - 1)] : [];
    }),
  )).sort((first, second) => first - second);
  return {
    ...defaultProgress(),
    completedTargets: profile?.completedTargets ?? [],
    completedLevels,
    highestUnlockedLevel: highestUnlockedFromCompletedLevels(completedLevels),
  };
}

export async function exportFullBackup(data: AppData): Promise<string> {
  const backup: FullBackup = {
    format: "gry-logiczne2-full-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    appData: normalizeAppData(data),
    progress: normalizeProgress(loadStoredProgress()),
    assets: await exportAssetSnapshot(),
  };
  return JSON.stringify(backup, null, 2);
}

export function parseFullBackup(rawValue: string): FullBackup {
  const parsed = JSON.parse(rawValue) as Partial<FullBackup>;
  if (parsed.format !== "gry-logiczne2-full-backup" || parsed.version !== 1 || !parsed.appData) {
    throw new Error("To nie jest pełna kopia aplikacji.");
  }
  const appData = importAppData(JSON.stringify(parsed.appData));
  return {
    format: "gry-logiczne2-full-backup",
    version: 1,
    createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    appData,
    progress: parsed.progress
      ? normalizeProgress(parsed.progress)
      : progressFromAppData(appData),
    assets: normalizeAssetSnapshot(parsed.assets),
  };
}

export async function restoreFullBackup(backup: FullBackup): Promise<number> {
  saveStoredProgress(backup.progress);
  return restoreAssetSnapshot(backup.assets);
}
