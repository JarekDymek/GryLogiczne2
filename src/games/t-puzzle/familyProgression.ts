import { getTPuzzleLevels } from "./levels";
import { puzzleFamilies, type PuzzleFamilyDefinition } from "./pieces";
import type { PuzzleFamilyId } from "./types";

function targetKey(levelId: string, targetId: string): string {
  return `${levelId}:${targetId}`;
}

export function isPuzzleFamilyComplete(
  completedTargets: Iterable<string>,
  familyId: PuzzleFamilyId,
): boolean {
  const completed = new Set(completedTargets);
  return getTPuzzleLevels(familyId).every((level) =>
    level.targets.some((target) => completed.has(targetKey(level.id, target.id))),
  );
}

export function availablePuzzleFamilies(
  completedTargets: Iterable<string>,
): PuzzleFamilyDefinition[] {
  const available = [puzzleFamilies[0]];
  if (!isPuzzleFamilyComplete(completedTargets, "gardner")) {
    return available;
  }

  available.push(puzzleFamilies[1]);
  if (isPuzzleFamilyComplete(completedTargets, "nob")) {
    available.push(puzzleFamilies[2]);
  }
  return available;
}
