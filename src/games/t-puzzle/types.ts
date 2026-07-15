export interface Point {
  x: number;
  y: number;
}

export interface Edge {
  start: Point;
  end: Point;
}

export interface FlipAxis {
  start: Point;
  end: Point;
}

export type PieceId = "blue-bar" | "green-wing" | "pink-keystone" | "yellow-cap";
export type PieceRotation = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
export type PuzzleFamilyId = "gardner" | "nob" | "asymmetric";

export interface PieceDefinition {
  id: PieceId;
  name: string;
  workColor: "blue" | "green" | "red" | "yellow";
  vertices: Point[];
  centroid: Point;
  flipAxis: FlipAxis;
  edges: Edge[];
}

export interface PieceState {
  pieceId: PieceId;
  position: Point;
  rotation: PieceRotation;
  flipped: boolean;
  zIndex: number;
  groupId: string;
  lastValidPosition: Point;
}

export interface PieceTransform {
  pieceId: PieceId;
  x: number;
  y: number;
  rotation: PieceRotation;
  flipped: boolean;
}

export interface TargetDefinition {
  id: string;
  familyId: PuzzleFamilyId;
  displayNumber: number;
  name: string;
  sourceReference: {
    file: string;
    figure: number;
  };
  previewScale: number;
  maskFigureNumber?: number;
  outline?: Point[];
  solutions: PieceTransform[][];
}

export interface LevelDefinition {
  id: string;
  displayNumber: number;
  name: string;
  difficulty: "easy" | "medium" | "hard" | "master";
  targets: TargetDefinition[];
  validation: {
    allowGlobalRotation: boolean;
    allowGlobalMirror: boolean;
    positionTolerance: number;
  };
  unlockRules: {
    unlockNextOnComplete: boolean;
  };
}

export interface SnapResult {
  delta: Point;
  targetGroupId: string;
}
