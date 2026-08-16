import { describe, expect, it } from "vitest";
import { getTPuzzleLevels } from "./levels";
import { namedGardnerTargets } from "./namedGardnerTargets";
import { puzzleFamilies } from "./pieces";

describe("etykiety figur T-Puzzle", () => {
  it.each(puzzleFamilies)("zachowuje oznaczenie T dla pierwszej figury rodziny $shortName", (family) => {
    const firstTarget = getTPuzzleLevels(family.id)[0].targets[0];

    expect(firstTarget).toMatchObject({
      id: `${family.id}-figure-001`,
      displayNumber: 1,
      displayLabel: "T",
      name: "Litera T",
    });
  });

  it.each(puzzleFamilies)("nie zmienia ID ani numeracji kolejnych figur rodziny $shortName", (family) => {
    const levels = getTPuzzleLevels(family.id);

    expect(levels[0].targets.map((target) => target.displayNumber)).toEqual([1, 2, 3]);
    expect(levels[0].targets.map((target) => target.displayLabel)).toEqual(["T", "2", "3"]);
    expect(levels[1].targets.map((target) => target.displayLabel)).toEqual(["4", "5", "6"]);
    expect(levels[1].targets.map((target) => target.id)).toEqual([
      `${family.id}-figure-004`,
      `${family.id}-figure-005`,
      `${family.id}-figure-006`,
    ]);
  });

  it.each(puzzleFamilies)("stosuje katalogowe nazwy w rodzinie $shortName", (family) => {
    const targets = getTPuzzleLevels(family.id).flatMap((level) => level.targets);

    expect(targets.slice(0, namedGardnerTargets.length).map((target) => target.name)).toEqual(
      namedGardnerTargets.map((target) => target.name),
    );
    expect(targets[36].name).toBe("Figura 37");
    expect(targets[101].name).toBe("Figura 102");
  });
});
