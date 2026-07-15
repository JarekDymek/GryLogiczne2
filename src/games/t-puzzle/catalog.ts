import type { LevelDefinition } from "./types";

export type FigureReconstructionStatus = "playable" | "needs-vector-reconstruction";

export type DifficultyStageId =
  | "starter"
  | "easy"
  | "medium"
  | "hard"
  | "expert"
  | "master";

export interface DifficultyStage {
  id: DifficultyStageId;
  name: string;
  figureRange: [number, number];
  unlockAfterCompleted: number;
}

export interface FigureCatalogEntry {
  figureNumber: number;
  stageId: DifficultyStageId;
  difficulty: LevelDefinition["difficulty"];
  sourceReference: {
    colorFile: string;
    silhouetteFile: string;
  };
  reconstructionStatus: FigureReconstructionStatus;
}

export const difficultyStages: DifficultyStage[] = [
  { id: "starter", name: "Start", figureRange: [1, 12], unlockAfterCompleted: 0 },
  { id: "easy", name: "Latwe", figureRange: [13, 24], unlockAfterCompleted: 8 },
  { id: "medium", name: "Srednie", figureRange: [25, 48], unlockAfterCompleted: 18 },
  { id: "hard", name: "Trudne", figureRange: [49, 68], unlockAfterCompleted: 36 },
  { id: "expert", name: "Eksperckie", figureRange: [69, 80], unlockAfterCompleted: 52 },
  { id: "master", name: "Mistrzowskie", figureRange: [81, 104], unlockAfterCompleted: 68 },
];

function stageForFigure(figureNumber: number): DifficultyStage {
  const stage = difficultyStages.find(
    ({ figureRange }) => figureNumber >= figureRange[0] && figureNumber <= figureRange[1],
  );

  if (!stage) {
    throw new Error(`Figure ${figureNumber} is outside the catalog range.`);
  }

  return stage;
}

function difficultyForStage(stageId: DifficultyStageId): LevelDefinition["difficulty"] {
  if (stageId === "starter" || stageId === "easy") {
    return "easy";
  }

  if (stageId === "medium") {
    return "medium";
  }

  if (stageId === "hard" || stageId === "expert") {
    return "hard";
  }

  return "master";
}

export const figureCatalog: FigureCatalogEntry[] = Array.from({ length: 104 }, (_, index) => {
  const figureNumber = index + 1;
  const stage = stageForFigure(figureNumber);

  return {
    figureNumber,
    stageId: stage.id,
    difficulty: difficultyForStage(stage.id),
    sourceReference: {
      colorFile: "Figury - kolorowe.jpeg",
      silhouetteFile: "Figury - czarne.jpeg",
    },
    reconstructionStatus: "playable",
  };
});
