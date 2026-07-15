import { describe, expect, it } from "vitest";
import { difficultyStages, figureCatalog } from "./catalog";
import { targetMasks } from "./targetMasks";

describe("T-Puzzle figure catalog", () => {
  it("tracks every figure visible in the full screenshots", () => {
    expect(figureCatalog).toHaveLength(104);
    expect(figureCatalog[0].figureNumber).toBe(1);
    expect(figureCatalog.at(-1)?.figureNumber).toBe(104);
  });

  it("keeps figure ranges continuous across difficulty stages", () => {
    const ranges = difficultyStages.flatMap((stage) => {
      const [first, last] = stage.figureRange;
      return Array.from({ length: last - first + 1 }, (_, index) => first + index);
    });

    expect(ranges).toEqual(figureCatalog.map((figure) => figure.figureNumber));
  });

  it("marks every extracted silhouette target as playable", () => {
    const playable = figureCatalog.filter((figure) => figure.reconstructionStatus === "playable");

    expect(playable).toHaveLength(104);
    expect(playable.map((figure) => figure.figureNumber)).toEqual(
      figureCatalog.map((figure) => figure.figureNumber),
    );
  });

  it("has a generated black target mask for every figure", () => {
    expect(Object.keys(targetMasks)).toHaveLength(104);

    for (const figure of figureCatalog) {
      expect(targetMasks[figure.figureNumber]).toBeDefined();
    }
  });
});
