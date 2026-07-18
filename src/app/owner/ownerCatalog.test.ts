import { describe, expect, it } from "vitest";
import { buildOwnerCatalog, solutionPreviewGeometry } from "./ownerCatalog";

describe("owner figure catalog", () => {
  const catalog = buildOwnerCatalog();

  it("contains all 306 playable figures from the three families", () => {
    expect(catalog).toHaveLength(306);
    for (const familyId of ["gardner", "nob", "asymmetric"] as const) {
      expect(catalog.filter((entry) => entry.familyId === familyId)).toHaveLength(102);
    }
    expect(new Set(catalog.map((entry) => entry.target.id)).size).toBe(306);
  });

  it("renders every catalog solution from exactly four valid colored pieces", () => {
    for (const entry of catalog) {
      const preview = solutionPreviewGeometry(entry.familyId, entry.target);
      expect(preview.polygons, entry.target.id).toHaveLength(4);
      expect(new Set(preview.polygons.map((polygon) => polygon.pieceId)).size).toBe(4);
      expect(new Set(preview.polygons.map((polygon) => polygon.color))).toEqual(
        new Set(["blue", "green", "red", "yellow"]),
      );
      expect(preview.viewBox).not.toContain("NaN");
      expect(preview.viewBox).not.toContain("Infinity");
    }
  });
});

