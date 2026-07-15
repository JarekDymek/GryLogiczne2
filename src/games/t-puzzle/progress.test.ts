import { describe, expect, it } from "vitest";
import { tPuzzleLevels } from "./levels";
import {
  defaultProgress,
  highestUnlockedFromCompletedLevels,
  normalizeProgress,
  parseStoredProgress,
  SOCIAL_GRADES,
  targetKey,
  TIME_LIMITS,
  unlockAfterSolvedLevel,
  withBestTime,
} from "./progress";

describe("T-Puzzle progression", () => {
  it("builds 34 data-driven levels with three variants each", () => {
    expect(tPuzzleLevels).toHaveLength(34);

    for (const level of tPuzzleLevels) {
      expect(level.targets).toHaveLength(3);
    }
  });

  it("maps figures 1-102 into level variants and keeps 103-104 as bonus material", () => {
    const mappedFigures = tPuzzleLevels.flatMap((level) =>
      level.targets.map((target) => target.displayNumber),
    );

    expect(mappedFigures).toHaveLength(102);
    expect(mappedFigures.slice(0, 9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(mappedFigures.at(-1)).toBe(102);
    expect(mappedFigures).not.toContain(103);
    expect(mappedFigures).not.toContain(104);
  });

  it("keeps the MOW timer grades at the required limits", () => {
    expect(SOCIAL_GRADES).toEqual(["0", "+1", "+2", "+3", "Dyrektor"]);
    expect(TIME_LIMITS).toEqual({
      "0": 75,
      "+1": 60,
      "+2": 45,
      "+3": 30,
      Dyrektor: 15,
    });
  });

  it("starts with only the first level unlocked", () => {
    expect(defaultProgress().highestUnlockedLevel).toBe(0);
  });

  it("unlocks the next level after one solved variant", () => {
    expect(unlockAfterSolvedLevel(0, 0)).toBe(1);
    expect(unlockAfterSolvedLevel(4, 2)).toBe(4);
    expect(unlockAfterSolvedLevel(33, 33)).toBe(33);
  });

  it("does not unlock further levels when no current level was solved", () => {
    expect(highestUnlockedFromCompletedLevels([], 34)).toBe(0);
    expect(highestUnlockedFromCompletedLevels([0], 34)).toBe(1);
    expect(highestUnlockedFromCompletedLevels([1], 34)).toBe(0);
  });

  it("normalizes and migrates old localStorage progress safely", () => {
    const legacyValue = JSON.stringify({
      levelIndex: 12,
      targetIndex: 99,
      completedLevels: [0, 1, 2],
      completedTargets: [targetKey(tPuzzleLevels[0].id, tPuzzleLevels[0].targets[0].id)],
      socialGrade: "+2",
    });

    const progress = parseStoredProgress(legacyValue);

    expect(progress.highestUnlockedLevel).toBe(3);
    expect(progress.levelIndex).toBe(3);
    expect(progress.targetIndex).toBe(2);
    expect(progress.completedTargets).toHaveLength(1);
    expect(progress.socialGrade).toBe("+2");
  });

  it("falls back to defaults for invalid progress data", () => {
    expect(parseStoredProgress("{")).toEqual(defaultProgress());
    expect(normalizeProgress(null)).toEqual(defaultProgress());
  });

  it("stores the best time per variant and grade", () => {
    const key = targetKey(tPuzzleLevels[0].id, tPuzzleLevels[0].targets[0].id);
    const first = withBestTime({}, key, "0", 52);
    const worse = withBestTime(first, key, "0", 61);
    const better = withBestTime(worse, key, "0", 48);

    expect(first[key]["0"]).toBe(52);
    expect(worse[key]["0"]).toBe(52);
    expect(better[key]["0"]).toBe(48);
  });
});
