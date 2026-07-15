import { describe, expect, it } from "vitest";
import { difficultyStages, figureCatalog } from "./catalog";
import { namedGardnerTargets } from "./namedGardnerTargets";
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

  it("keeps the extracted silhouettes as archival source material", () => {
    const archived = figureCatalog.filter((figure) => figure.reconstructionStatus === "archived-source");

    expect(archived).toHaveLength(104);
    expect(archived.map((figure) => figure.figureNumber)).toEqual(
      figureCatalog.map((figure) => figure.figureNumber),
    );
  });

  it("has a generated black target mask for every figure", () => {
    expect(Object.keys(targetMasks)).toHaveLength(104);

    for (const figure of figureCatalog) {
      expect(targetMasks[figure.figureNumber]).toBeDefined();
    }
  });

  it("defines 36 unique Polish names and solid masks for Gardner", () => {
    expect(namedGardnerTargets).toHaveLength(36);
    expect(new Set(namedGardnerTargets.map((target) => target.name)).size).toBe(36);
    for (const target of namedGardnerTargets) {
      expect(target.mask.rows).toHaveLength(target.mask.size);
      expect(target.mask.rows.every((row) => row.length === target.mask.size)).toBe(true);
      expect(target.mask.rows.some((row) => row.includes("1"))).toBe(true);
    }
  });

});
