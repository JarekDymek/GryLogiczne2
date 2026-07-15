import { figureCatalog } from "./catalog";
import { geometryTolerance } from "./config";
import type { LevelDefinition, TargetDefinition } from "./types";

const TARGETS_PER_LEVEL = 3;

const CLASSIC_T_SOLUTION = [
  { pieceId: "blue-bar", x: 0, y: 0, rotation: 0, flipped: false },
  { pieceId: "green-wing", x: 0, y: 0, rotation: 0, flipped: false },
  { pieceId: "pink-keystone", x: 0, y: 0, rotation: 0, flipped: false },
  { pieceId: "yellow-cap", x: 0, y: 0, rotation: 0, flipped: false },
] as const;

function targetForFigure(figureNumber: number): TargetDefinition {
  const catalogEntry = figureCatalog.find((entry) => entry.figureNumber === figureNumber);

  if (!catalogEntry) {
    throw new Error(`Brak figury ${figureNumber} w katalogu.`);
  }

  return {
    id: `figure-${String(figureNumber).padStart(3, "0")}`,
    displayNumber: figureNumber,
    name: `Figura ${figureNumber}`,
    sourceReference: {
      file: catalogEntry.sourceReference.silhouetteFile,
      figure: figureNumber,
    },
    previewScale: 0.35,
    maskFigureNumber: figureNumber,
    // Figures 1-3 are the same regular T in different source orientations.
    // Their source masks are visibly stretched, so validate them against the exact tile geometry.
    solutions: figureNumber <= 3 ? [CLASSIC_T_SOLUTION.map((piece) => ({ ...piece }))] : [],
  };
}

function levelName(firstFigure: number, lastFigure: number): string {
  return firstFigure === lastFigure
    ? `Figura ${firstFigure}`
    : `Figury ${firstFigure}–${lastFigure}`;
}

const PLAYABLE_FIGURE_COUNT = 102;

export const tPuzzleLevels: LevelDefinition[] = Array.from(
  { length: PLAYABLE_FIGURE_COUNT / TARGETS_PER_LEVEL },
  (_, levelIndex) => {
    const firstFigure = levelIndex * TARGETS_PER_LEVEL + 1;
    const figures = figureCatalog.slice(
      levelIndex * TARGETS_PER_LEVEL,
      levelIndex * TARGETS_PER_LEVEL + TARGETS_PER_LEVEL,
    );
    const lastFigure = figures.at(-1)?.figureNumber ?? firstFigure;

    return {
      id: `t-puzzle-stage-${String(levelIndex + 1).padStart(2, "0")}`,
      displayNumber: levelIndex + 1,
      name: `Poziom ${levelIndex + 1}`,
      difficulty: figures[0].difficulty,
      targets: figures.map((figure) => targetForFigure(figure.figureNumber)),
      validation: {
        allowGlobalRotation: true,
        allowGlobalMirror: true,
        positionTolerance: geometryTolerance.position,
      },
      unlockRules: {
        unlockNextOnComplete: true,
      },
    };
  },
);
