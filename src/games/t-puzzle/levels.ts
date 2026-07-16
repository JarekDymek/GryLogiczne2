import { geometryTolerance } from "./config";
import { getVerifiedPuzzleSolutions } from "./generatedPuzzles";
import { namedGardnerTargets } from "./namedGardnerTargets";
import { puzzleFamiliesById } from "./pieces";
import type { LevelDefinition, PuzzleFamilyId, TargetDefinition } from "./types";

const TARGETS_PER_LEVEL = 3;

function targetForFigure(figureNumber: number, familyId: PuzzleFamilyId): TargetDefinition {
  if (figureNumber < 1 || figureNumber > 102) {
    throw new Error(`Brak figury ${figureNumber} w katalogu.`);
  }

  const namedTarget = familyId === "gardner" ? namedGardnerTargets[figureNumber - 1] : undefined;
  const number = String(figureNumber).padStart(3, "0");

  return {
    id: `${familyId}-figure-${String(figureNumber).padStart(3, "0")}`,
    familyId,
    displayNumber: figureNumber,
    name: namedTarget?.name ?? `Wariant ${figureNumber}`,
    sourceReference: {
      file: namedTarget ? "T-puzle-figury.jpg" : `Puzzle Lab v2: ${puzzleFamiliesById[familyId].name}`,
      figure: figureNumber,
    },
    previewScale: 0.35,
    previewImagePath: namedTarget ? `t-puzzle/named/figure-${number}.svg` : undefined,
    solutionImagePath: namedTarget ? `t-puzzle/named-solutions/figure-${number}.svg` : undefined,
    maskFigureNumber: namedTarget?.figureNumber,
    solutions: namedTarget
      ? [namedTarget.solution.map((piece) => ({ ...piece }))]
      : [getVerifiedPuzzleSolutions(familyId)[figureNumber - 1].map((piece) => ({ ...piece }))],
  };
}

function stageForLevel(levelIndex: number): {
  name: string;
  difficulty: LevelDefinition["difficulty"];
} {
  if (levelIndex < 8) {
    return { name: "Rozgrzewka", difficulty: "easy" };
  }
  if (levelIndex < 17) {
    return { name: "Orientacja", difficulty: "medium" };
  }
  if (levelIndex < 26) {
    return { name: "Transformacje", difficulty: "hard" };
  }
  return { name: "Mistrzowskie", difficulty: "master" };
}

const PLAYABLE_FIGURE_COUNT = 102;

function createLevels(familyId: PuzzleFamilyId): LevelDefinition[] {
  return Array.from({ length: PLAYABLE_FIGURE_COUNT / TARGETS_PER_LEVEL }, (_, levelIndex) => {
    const firstFigure = levelIndex * TARGETS_PER_LEVEL + 1;
    const figures = Array.from({ length: TARGETS_PER_LEVEL }, (_, index) => firstFigure + index);
    const stage = stageForLevel(levelIndex);

    return {
      id: `${familyId}-stage-${String(levelIndex + 1).padStart(2, "0")}`,
      displayNumber: levelIndex + 1,
      name: `${stage.name} ${levelIndex + 1}`,
      difficulty: stage.difficulty,
      targets: figures.map((figureNumber) => targetForFigure(figureNumber, familyId)),
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
