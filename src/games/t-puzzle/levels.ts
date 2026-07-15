import { figureCatalog } from "./catalog";
import { geometryTolerance } from "./config";
import { getVerifiedPuzzleSolutions } from "./generatedPuzzles";
import { puzzleFamiliesById } from "./pieces";
import type { LevelDefinition, PuzzleFamilyId, TargetDefinition } from "./types";

const TARGETS_PER_LEVEL = 3;

function targetForFigure(figureNumber: number, familyId: PuzzleFamilyId): TargetDefinition {
  const catalogEntry = figureCatalog.find((entry) => entry.figureNumber === figureNumber);

  if (!catalogEntry) {
    throw new Error(`Brak figury ${figureNumber} w katalogu.`);
  }

  return {
    id: `${familyId}-figure-${String(figureNumber).padStart(3, "0")}`,
    familyId,
    displayNumber: figureNumber,
    name: `Figura ${figureNumber}`,
    sourceReference: { file: puzzleFamiliesById[familyId].name, figure: figureNumber },
    previewScale: 0.35,
    solutions: [getVerifiedPuzzleSolutions(familyId)[figureNumber - 1].map((piece) => ({ ...piece }))],
  };
}

function levelName(firstFigure: number, lastFigure: number): string {
  return firstFigure === lastFigure
    ? `Figura ${firstFigure}`
    : `Figury ${firstFigure}–${lastFigure}`;
}

const PLAYABLE_FIGURE_COUNT = 102;

function createLevels(familyId: PuzzleFamilyId): LevelDefinition[] {
  return Array.from({ length: PLAYABLE_FIGURE_COUNT / TARGETS_PER_LEVEL }, (_, levelIndex) => {
    const firstFigure = levelIndex * TARGETS_PER_LEVEL + 1;
    const figures = figureCatalog.slice(
      levelIndex * TARGETS_PER_LEVEL,
      levelIndex * TARGETS_PER_LEVEL + TARGETS_PER_LEVEL,
    );
    const lastFigure = figures.at(-1)?.figureNumber ?? firstFigure;

    return {
      id: `${familyId}-stage-${String(levelIndex + 1).padStart(2, "0")}`,
      displayNumber: levelIndex + 1,
      name: `Poziom ${levelIndex + 1}`,
      difficulty: figures[0].difficulty,
      targets: figures.map((figure) => targetForFigure(figure.figureNumber, familyId)),
      validation: {
        allowGlobalRotation: true,
        allowGlobalMirror: true,
        positionTolerance: geometryTolerance.position,
      },
      unlockRules: {
        unlockNextOnComplete: true,
      },
    };
  });
}

const levelCache: Partial<Record<PuzzleFamilyId, LevelDefinition[]>> = {};

export function getTPuzzleLevels(familyId: PuzzleFamilyId): LevelDefinition[] {
  if (!levelCache[familyId]) {
    levelCache[familyId] = createLevels(familyId);
  }
  return levelCache[familyId]!;
}

export const tPuzzleLevels = getTPuzzleLevels("gardner");
