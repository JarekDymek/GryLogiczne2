import { describe, expect, it } from "vitest";
import { availablePuzzleFamilies, isPuzzleFamilyComplete } from "./familyProgression";
import { getTPuzzleLevels } from "./levels";
import type { PuzzleFamilyId } from "./types";

function completedFamilyTargets(familyId: PuzzleFamilyId): string[] {
  return getTPuzzleLevels(familyId).map(
    (level) => `${level.id}:${level.targets[0].id}`,
  );
}

describe("kolejne rodziny T-Puzzle", () => {
  it("zaczyna wyłącznie od rodziny Bystry", () => {
    expect(availablePuzzleFamilies([]).map((family) => family.shortName)).toEqual(["Bystry"]);
  });

  it("nie uznaje częściowo ukończonej rodziny za ukończoną", () => {
    const incomplete = completedFamilyTargets("gardner").slice(0, -1);

    expect(isPuzzleFamilyComplete(incomplete, "gardner")).toBe(false);
    expect(availablePuzzleFamilies(incomplete).map((family) => family.id)).toEqual(["gardner"]);
  });

  it("odblokowuje Nob po zaliczeniu co najmniej jednego wariantu w każdym poziomie Bystry", () => {
    const completedBystry = completedFamilyTargets("gardner");

    expect(isPuzzleFamilyComplete(completedBystry, "gardner")).toBe(true);
    expect(availablePuzzleFamilies(completedBystry).map((family) => family.id)).toEqual([
      "gardner",
      "nob",
    ]);
  });

  it("odblokowuje Asymetryczne dopiero po ukończeniu Bystry i Nob", () => {
    const completed = [
      ...completedFamilyTargets("gardner"),
      ...completedFamilyTargets("nob"),
    ];

    expect(availablePuzzleFamilies(completed).map((family) => family.id)).toEqual([
      "gardner",
      "nob",
      "asymmetric",
    ]);
  });
});
