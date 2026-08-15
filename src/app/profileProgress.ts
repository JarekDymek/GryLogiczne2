import { TARGETS_PER_LEVEL } from "../games/t-puzzle/progress";

function levelIdFromTargetKey(targetKey: string): string | null {
  const separator = targetKey.indexOf(":");
  return separator > 0 ? targetKey.slice(0, separator) : null;
}

function completedTargetCount(completedTargets: Iterable<string>, levelId: string): number {
  const prefix = `${levelId}:`;
  return new Set(
    Array.from(completedTargets).filter((targetKey) => targetKey.startsWith(prefix)),
  ).size;
}

export function completedFullLevelCount(completedTargets: Iterable<string>): number {
  const targetsByLevel = new Map<string, Set<string>>();
  for (const targetKey of completedTargets) {
    const levelId = levelIdFromTargetKey(targetKey);
    if (!levelId) continue;
    const levelTargets = targetsByLevel.get(levelId) ?? new Set<string>();
    levelTargets.add(targetKey);
    targetsByLevel.set(levelId, levelTargets);
  }
  return Array.from(targetsByLevel.values()).filter(
    (targets) => targets.size >= TARGETS_PER_LEVEL,
  ).length;
}

export function newlyCompletesLevel(
  previousTargets: Iterable<string>,
  nextTargets: Iterable<string>,
  targetKey: string,
): boolean {
  const levelId = levelIdFromTargetKey(targetKey);
  if (!levelId) return false;
  return completedTargetCount(previousTargets, levelId) < TARGETS_PER_LEVEL &&
    completedTargetCount(nextTargets, levelId) >= TARGETS_PER_LEVEL;
}
