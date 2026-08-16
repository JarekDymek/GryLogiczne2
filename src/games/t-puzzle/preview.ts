import { transformedVertices } from "./geometry";
import { piecesByFamily } from "./pieces";
import type {
  PieceState,
  Point,
  PuzzleFamilyId,
  TargetDefinition,
} from "./types";

export interface SolutionPolygon {
  pieceId: string;
  color: "blue" | "green" | "red" | "yellow";
  points: Point[];
}

export interface SolutionPreviewGeometry {
  polygons: SolutionPolygon[];
  viewBox: string;
}

export function solutionPreviewGeometry(
  familyId: PuzzleFamilyId,
  target: TargetDefinition,
  paddingRatio = 0.12,
): SolutionPreviewGeometry {
  const pieces = piecesByFamily[familyId];
  const solution = target.solutions[0];
  const polygons = solution.map((transform, index) => {
    const piece = pieces[transform.pieceId];
    const state: PieceState = {
      pieceId: transform.pieceId,
      position: { x: transform.x, y: transform.y },
      rotation: transform.rotation,
      flipped: transform.flipped,
      zIndex: index,
      groupId: "solution-preview",
      lastValidPosition: { x: transform.x, y: transform.y },
    };
    return {
      pieceId: transform.pieceId,
      color: piece.workColor,
      points: transformedVertices(piece, state),
    };
  });
  const allPoints = polygons.flatMap((polygon) => polygon.points);
  const minX = Math.min(...allPoints.map((point) => point.x));
  const maxX = Math.max(...allPoints.map((point) => point.x));
  const minY = Math.min(...allPoints.map((point) => point.y));
  const maxY = Math.max(...allPoints.map((point) => point.y));
  const width = Math.max(maxX - minX, 0.5);
  const height = Math.max(maxY - minY, 0.5);
  const padding = Math.max(width, height) * paddingRatio;

  return {
    polygons,
    viewBox: `${minX - padding} ${minY - padding} ${width + 2 * padding} ${height + 2 * padding}`,
  };
}
