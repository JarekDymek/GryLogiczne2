import { getTPuzzleLevels } from "../../games/t-puzzle/levels";
import { puzzleFamilies } from "../../games/t-puzzle/pieces";
import { solutionPreviewGeometry } from "../../games/t-puzzle/preview";
import type { PuzzleFamilyId, TargetDefinition } from "../../games/t-puzzle/types";

export { solutionPreviewGeometry };

export interface OwnerCatalogEntry {
  familyId: PuzzleFamilyId;
  familyName: string;
  levelNumber: number;
  target: TargetDefinition;
}
export function buildOwnerCatalog(): OwnerCatalogEntry[] {
  return puzzleFamilies.flatMap((family) =>
    getTPuzzleLevels(family.id).flatMap((level) =>
      level.targets.map((target) => ({
        familyId: family.id,
        familyName: family.shortName,
        levelNumber: level.displayNumber,
        target,
      })),
    ),
  );
}

