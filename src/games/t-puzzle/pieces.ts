import { polygonCentroid, polygonEdges } from "./geometry";
import type { PieceDefinition, PieceState, PuzzleFamilyId } from "./types";

const SQRT2 = Math.SQRT2;
export const T_PUZZLE_HEIGHT = 6 - 2 * SQRT2;

export interface PuzzleFamilyDefinition {
  id: PuzzleFamilyId;
  name: string;
  shortName: string;
  pieces: PieceDefinition[];
}

function definePiece(
  piece: Omit<PieceDefinition, "centroid" | "edges">,
): PieceDefinition {
  const centroid = polygonCentroid(piece.vertices);
  return {
    ...piece,
    centroid,
    edges: polygonEdges(piece.vertices),
  };
}

function createFamilyPieces(topCut: number, outerWidth: number, stemBottom: number): PieceDefinition[] {
  return [definePiece({
    id: "blue-bar",
    name: "Dolny trapez trzonu",
    workColor: "blue",
    vertices: [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: stemBottom },
      { x: 1, y: stemBottom },
    ],
    flipAxis: { start: { x: 1.5, y: 1 }, end: { x: 1.5, y: stemBottom } },
  }),
  definePiece({
    id: "green-wing",
    name: "Centralny pieciokat",
    workColor: "green",
    vertices: [
      { x: 0, y: 0 },
      { x: topCut, y: 0 },
      { x: 1 + topCut, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    flipAxis: { start: { x: 1, y: 0 }, end: { x: 1, y: 2 } },
  }),
  definePiece({
    id: "pink-keystone",
    name: "Lewy trojkat belki",
    workColor: "red",
    vertices: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    flipAxis: { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
  }),
  definePiece({
    id: "yellow-cap",
    name: "Prawy trapez belki",
    workColor: "yellow",
    vertices: [
      { x: topCut, y: 0 },
      { x: outerWidth, y: 0 },
      { x: outerWidth, y: 1 },
      { x: 1 + topCut, y: 1 },
    ],
    flipAxis: { start: { x: (topCut + outerWidth) / 2, y: 0 }, end: { x: (topCut + outerWidth) / 2, y: 1 } },
  }),
] satisfies PieceDefinition[];
}

export const puzzleFamilies: PuzzleFamilyDefinition[] = [
  {
    id: "gardner",
    name: "Gardner's T",
    shortName: "Gardner",
    pieces: createFamilyPieces(SQRT2, 3, T_PUZZLE_HEIGHT),
  },
  {
    id: "nob",
    name: "Nob's T",
    shortName: "Nob",
    pieces: createFamilyPieces(1.5, 3, 4),
  },
  {
    id: "asymmetric",
    name: "Asymmetric T",
    shortName: "Asymetryczne",
    pieces: createFamilyPieces(SQRT2, 2 * SQRT2, 1 + 2 * SQRT2),
  },
];

export const puzzleFamiliesById = Object.fromEntries(
  puzzleFamilies.map((family) => [family.id, family]),
) as Record<PuzzleFamilyId, PuzzleFamilyDefinition>;

export const pieceDefinitionsByFamily = Object.fromEntries(
  puzzleFamilies.map((family) => [family.id, family.pieces]),
) as Record<PuzzleFamilyId, PieceDefinition[]>;

export const piecesByFamily = Object.fromEntries(
  puzzleFamilies.map((family) => [
    family.id,
    Object.fromEntries(family.pieces.map((piece) => [piece.id, piece])),
  ]),
) as Record<PuzzleFamilyId, Record<PieceDefinition["id"], PieceDefinition>>;

export const pieceDefinitions = pieceDefinitionsByFamily.gardner;

export const piecesById = piecesByFamily.gardner;

export function createInitialPieceStates(): PieceState[] {
  return [
    {
      pieceId: "blue-bar",
      position: { x: -2.85, y: 1.6 },
      rotation: 0,
      flipped: false,
      zIndex: 1,
      groupId: "group-blue",
      lastValidPosition: { x: -2.85, y: 1.6 },
    },
    {
      pieceId: "green-wing",
      position: { x: -0.5, y: 0.65 },
      rotation: 180,
      flipped: false,
      zIndex: 2,
      groupId: "group-green",
      lastValidPosition: { x: -0.5, y: 0.65 },
    },
    {
      pieceId: "pink-keystone",
      position: { x: -2.7, y: 5.25 },
      rotation: 90,
      flipped: false,
      zIndex: 3,
      groupId: "group-red",
      lastValidPosition: { x: -2.7, y: 5.25 },
    },
    {
      pieceId: "yellow-cap",
      position: { x: -0.5, y: 5.15 },
      rotation: 270,
      flipped: false,
      zIndex: 4,
      groupId: "group-yellow",
      lastValidPosition: { x: -0.5, y: 5.15 },
    },
  ];
}
