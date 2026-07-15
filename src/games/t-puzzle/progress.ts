import { tPuzzleLevels } from "./levels";

export type SocialGrade = "0" | "+1" | "+2" | "+3" | "Dyrektor";
export type AttemptState = "idle" | "running" | "solved" | "expired";

export const TIME_LIMITS: Record<SocialGrade, number> = {
  "0": 75,
  "+1": 60,
  "+2": 45,
  "+3": 30,
  Dyrektor: 15,
};

export const SOCIAL_GRADES = Object.keys(TIME_LIMITS) as SocialGrade[];
export const PROGRESS_STORAGE_KEY = "gry-logiczne2:t-puzzle-progress:v1";
export const LEGACY_PROGRESS_STORAGE_KEYS = [
  "gry-logiczne:t-puzzle-progress:v3",
  "gry-logiczne:t-puzzle-progress:v2",
  "gry-logiczne:t-puzzle-progress:v1",
];

export interface StoredProgress {
  levelIndex: number;
  targetIndex: number;
  highestUnlockedLevel: number;
  completedLevels: number[];
  completedTargets: string[];
  socialGrade: SocialGrade;
  bestTimes: Record<string, Partial<Record<SocialGrade, number>>>;
}

export function targetKey(levelId: string, targetId: string): string {
  return `${levelId}:${targetId}`;
}

export function defaultProgress(): StoredProgress {
  return {
    levelIndex: 0,
    targetIndex: 0,
    highestUnlockedLevel: 0,
    completedLevels: [],
    completedTargets: [],
    socialGrade: "0",
    bestTimes: {},
  };
}

function clampInteger(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}

function uniqueValidNumbers(value: unknown, max: number): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry))
        .map((entry) => Math.min(Math.max(Math.trunc(entry), 0), max)),
    ),
  ).sort((a, b) => a - b);
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === "string")));
}

function normalizeBestTimes(value: unknown): StoredProgress["bestTimes"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const output: StoredProgress["bestTimes"] = {};

  for (const [key, gradeMap] of Object.entries(value)) {
    if (!gradeMap || typeof gradeMap !== "object" || Array.isArray(gradeMap)) {
      continue;
    }

    const normalizedGradeMap: Partial<Record<SocialGrade, number>> = {};
    for (const grade of SOCIAL_GRADES) {
      const seconds = (gradeMap as Record<string, unknown>)[grade];
      if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) {
        normalizedGradeMap[grade] = Math.trunc(seconds);
      }
    }

    if (Object.keys(normalizedGradeMap).length > 0) {
      output[key] = normalizedGradeMap;
    }
  }

  return output;
}

export function highestUnlockedFromCompletedLevels(
  completedLevels: Iterable<number>,
  levelCount = tPuzzleLevels.length,
): number {
  const completed = new Set(completedLevels);
  let highestUnlocked = 0;

  while (highestUnlocked < levelCount - 1 && completed.has(highestUnlocked)) {
    highestUnlocked += 1;
  }

  return highestUnlocked;
}

export function normalizeProgress(
  value: unknown,
  levelCount = tPuzzleLevels.length,
): StoredProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultProgress();
  }

  const parsed = value as Partial<StoredProgress>;
  const maxLevelIndex = Math.max(levelCount - 1, 0);
  const completedLevels = uniqueValidNumbers(parsed.completedLevels, maxLevelIndex);
  const migratedHighestUnlocked = highestUnlockedFromCompletedLevels(completedLevels, levelCount);
  const explicitHighestUnlocked =
    typeof parsed.highestUnlockedLevel === "number"
      ? clampInteger(parsed.highestUnlockedLevel, 0, maxLevelIndex)
      : migratedHighestUnlocked;
  const highestUnlockedLevel = Math.max(explicitHighestUnlocked, migratedHighestUnlocked);
  const levelIndex = clampInteger(parsed.levelIndex, 0, highestUnlockedLevel);
  const maxTargetIndex = Math.max(tPuzzleLevels[levelIndex]?.targets.length ?? 1, 1) - 1;

  return {
    levelIndex,
    targetIndex: clampInteger(parsed.targetIndex, 0, maxTargetIndex),
    highestUnlockedLevel,
    completedLevels,
    completedTargets: uniqueStrings(parsed.completedTargets),
    socialGrade: SOCIAL_GRADES.includes(parsed.socialGrade as SocialGrade)
      ? (parsed.socialGrade as SocialGrade)
      : "0",
    bestTimes: normalizeBestTimes(parsed.bestTimes),
  };
}

export function parseStoredProgress(rawValue: string | null): StoredProgress {
  if (!rawValue) {
    return defaultProgress();
  }

  try {
    return normalizeProgress(JSON.parse(rawValue));
  } catch {
    return defaultProgress();
  }
}

export function loadStoredProgress(): StoredProgress {
  if (typeof window === "undefined") {
    return defaultProgress();
  }

  const currentValue = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (currentValue) {
    return parseStoredProgress(currentValue);
  }

  for (const legacyKey of LEGACY_PROGRESS_STORAGE_KEYS) {
    const legacyValue = window.localStorage.getItem(legacyKey);
    if (legacyValue) {
      const migrated = parseStoredProgress(legacyValue);
      saveStoredProgress(migrated);
      return migrated;
    }
  }

  return defaultProgress();
}

export function saveStoredProgress(progress: StoredProgress): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(normalizeProgress(progress)));
}

export function resetStoredProgress(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
  for (const legacyKey of LEGACY_PROGRESS_STORAGE_KEYS) {
    window.localStorage.removeItem(legacyKey);
  }
}

export function unlockAfterSolvedLevel(currentHighest: number, solvedLevelIndex: number): number {
  return Math.min(
    tPuzzleLevels.length - 1,
    Math.max(currentHighest, solvedLevelIndex + 1),
  );
}

export function solvedCountForLevel(levelIndex: number, completedTargets: Set<string>): number {
  const level = tPuzzleLevels[levelIndex];
  if (!level) {
    return 0;
  }

  return level.targets.filter((target) => completedTargets.has(targetKey(level.id, target.id))).length;
}

export function withBestTime(
  bestTimes: StoredProgress["bestTimes"],
  key: string,
  grade: SocialGrade,
  seconds: number,
): StoredProgress["bestTimes"] {
  const previous = bestTimes[key]?.[grade];

  if (previous !== undefined && previous <= seconds) {
    return bestTimes;
  }

  return {
    ...bestTimes,
    [key]: {
      ...bestTimes[key],
      [grade]: Math.max(0, Math.trunc(seconds)),
    },
  };
}
