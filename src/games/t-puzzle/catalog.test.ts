import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { difficultyStages, figureCatalog } from "./catalog";
import { getTPuzzleLevels } from "./levels";
import { namedGardnerTargets } from "./namedGardnerTargets";
import { targetMasks } from "./targetMasks";

function isMaskConnected(rows: string[]) {
  const width = rows[0].length;
  const filled = new Set<string>();
  rows.forEach((row, y) => {
    [...row].forEach((value, x) => {
      if (value === "1") filled.add(`${x}:${y}`);
    });
  });
  const first = filled.values().next().value as string | undefined;
  if (!first) return false;

  const seen = new Set([first]);
  const queue = [first];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const [x, y] = current.split(":").map(Number);
    for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
      for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
        const nextX = x + deltaX;
        const nextY = y + deltaY;
        const next = `${nextX}:${nextY}`;
        if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < rows.length && filled.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
  }
  return seen.size === filled.size;
}

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
      expect(isMaskConnected(target.mask.rows)).toBe(true);
    }

    expect(namedGardnerTargets[4].name).toBe("Śmigło");
    expect(namedGardnerTargets[7].name).toBe("Strzała");
    expect(namedGardnerTargets[12].name).toBe("Siódemka");
    expect(namedGardnerTargets[32].name).toBe("Młotek");
  });

  it("uses scalable SVG assets without internal seams for the named figures", () => {
    const namedTargets = getTPuzzleLevels("gardner")
      .flatMap((level) => level.targets)
      .slice(0, 36);

    for (const target of namedTargets) {
      expect(target.previewImagePath?.endsWith(".svg")).toBe(true);
      expect(target.solutionImagePath?.endsWith(".svg")).toBe(true);

      const previewPath = `public/${target.previewImagePath}`;
      const solutionPath = `public/${target.solutionImagePath}`;
      expect(existsSync(previewPath)).toBe(true);
      expect(existsSync(solutionPath)).toBe(true);

      const previewSvg = readFileSync(previewPath, "utf8");
      const solutionSvg = readFileSync(solutionPath, "utf8");
      expect(previewSvg.match(/<polygon/g)).toHaveLength(4);
      expect(previewSvg.match(/data-piece=/g)).toHaveLength(4);
      expect(previewSvg).toContain('fill="#14213d"');
      expect(previewSvg).toContain('stroke="#14213d"');
      expect(previewSvg).not.toContain("<mask");
      expect(previewSvg).not.toContain("<image");
      expect(solutionSvg.match(/<polygon/g)).toHaveLength(4);
      expect(solutionSvg.match(/data-piece=/g)).toHaveLength(4);
      expect(solutionSvg).toContain('stroke-width="0.55"');
      expect(solutionSvg).not.toContain('stroke-width="4.6"');
      expect(solutionSvg).not.toContain("clip-path");
      expect(solutionSvg).not.toContain("<image");

      for (const [piece, vertexCount] of [
        ["blue", 4],
        ["green", 5],
        ["red", 3],
        ["yellow", 4],
      ] as const) {
        const match = solutionSvg.match(
          new RegExp(`<polygon data-piece="${piece}" points="([^"]+)"`),
        );
        expect(match, `missing exact ${piece} piece in ${solutionPath}`).not.toBeNull();
        const vertices = match![1].split(" ").map((point) => point.split(",").map(Number));
        expect(vertices).toHaveLength(vertexCount);

        vertices.forEach(([x, y], index) => {
          const [nextX, nextY] = vertices[(index + 1) % vertices.length];
          const angle = (Math.atan2(nextY - y, nextX - x) * 180) / Math.PI;
          const nearestAllowedAngle = Math.round(angle / 45) * 45;
          expect(Math.abs(angle - nearestAllowedAngle)).toBeLessThan(0.15);
        });
      }
    }
  });
});
