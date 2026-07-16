import type { LevelDefinition, PieceState, PieceTransform, TargetDefinition } from "./types";
import { hasAnyOverlap, transformedVertices } from "./geometry";
import { piecesByFamily, piecesById as gardnerPiecesById } from "./pieces";
import type { PieceDefinition, PieceId } from "./types";
import { namedGardnerTargetMasks } from "./namedGardnerTargets";
import { targetMasks } from "./targetMasks";

const SILHOUETTE_PADDING = 3;
// A target without internal lines must still be matched precisely.  Loose
// silhouette thresholds make visually different arrangements look "solved".
const SILHOUETTE_MATCH_THRESHOLD = 0.97;
const SILHOUETTE_MISS_LIMIT = 0.025;
const SILHOUETTE_EXTRA_LIMIT = 0.025;
const SOLUTION_SILHOUETTE_SIZE = 96;
const SOLUTION_SILHOUETTE_MATCH_THRESHOLD = 0.97;
const SOLUTION_SILHOUETTE_MISS_LIMIT = 0.025;
const SOLUTION_SILHOUETTE_EXTRA_LIMIT = 0.025;

function normalizedTransforms(states: PieceState[]): PieceTransform[] {
  const minX = Math.min(...states.map((state) => state.position.x));
  const minY = Math.min(...states.map((state) => state.position.y));

  return states
    .map((state) => ({
      pieceId: state.pieceId,
      x: state.position.x - minX,
      y: state.position.y - minY,
      rotation: state.rotation,
      flipped: state.flipped,
    }))
    .sort((a, b) => a.pieceId.localeCompare(b.pieceId));
}

function normalizeSolution(solution: PieceTransform[]): PieceTransform[] {
  const minX = Math.min(...solution.map((state) => state.x));
  const minY = Math.min(...solution.map((state) => state.y));

  return solution
    .map((state) => ({
      ...state,
      x: state.x - minX,
      y: state.y - minY,
    }))
    .sort((a, b) => a.pieceId.localeCompare(b.pieceId));
}

function matchesSolution(
  actual: PieceTransform[],
  expected: PieceTransform[],
  tolerance: number,
): boolean {
  return actual.every((state, index) => {
    const target = expected[index];
    return (
      state.pieceId === target.pieceId &&
      state.rotation === target.rotation &&
      state.flipped === target.flipped &&
      Math.abs(state.x - target.x) <= tolerance &&
      Math.abs(state.y - target.y) <= tolerance
    );
  });
}

function pointOnSegment(point: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
  if (Math.abs(cross) > 0.001) {
    return false;
  }

  const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
  if (dot < -0.001) {
    return false;
  }

  const squaredLength = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot <= squaredLength + 0.001;
}

function pointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
  for (let index = 0; index < polygon.length; index += 1) {
    const nextIndex = (index + 1) % polygon.length;
    if (pointOnSegment(point, polygon[index], polygon[nextIndex])) {
      return true;
    }
  }

  let inside = false;
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const crossesY = current.y > point.y !== previous.y > point.y;
    if (!crossesY) {
      continue;
    }

    const crossingX =
      ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    if (point.x < crossingX) {
      inside = !inside;
    }
  }

  return inside;
}

function rasterizePolygons(polygons: Array<Array<{ x: number; y: number }>>, size: number): string[] | null {
  const vertices = polygons.flat();
  const minX = Math.min(...vertices.map((point) => point.x));
  const maxX = Math.max(...vertices.map((point) => point.x));
  const minY = Math.min(...vertices.map((point) => point.y));
  const maxY = Math.max(...vertices.map((point) => point.y));
  const width = maxX - minX;
  const height = maxY - minY;

  if (width <= 0 || height <= 0) {
    return null;
  }

  const scale = (size - SILHOUETTE_PADDING * 2) / Math.max(width, height);
  const offsetX = (size - width * scale) / 2 - minX * scale;
  const offsetY = (size - height * scale) / 2 - minY * scale;
  const normalizedPolygons = polygons.map((polygon) =>
    polygon.map((point) => ({
      x: point.x * scale + offsetX,
      y: point.y * scale + offsetY,
    })),
  );

  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const point = { x: x + 0.5, y: y + 0.5 };
      return normalizedPolygons.some((polygon) => pointInPolygon(point, polygon)) ? "1" : "0";
    }).join(""),
  );
}

function rasterizeStates(
  states: PieceState[],
  size: number,
  pieces: Record<PieceId, PieceDefinition> = gardnerPiecesById,
): string[] | null {
  return rasterizePolygons(
    states.map((state) => transformedVertices(pieces[state.pieceId], state)),
    size,
  );
}

function globallyTransformedPolygons(
  states: PieceState[],
  rotation: number,
  mirrored: boolean,
  pieces: Record<PieceId, PieceDefinition> = gardnerPiecesById,
): Array<Array<{ x: number; y: number }>> {
  const polygons = states.map((state) => transformedVertices(pieces[state.pieceId], state));
  const vertices = polygons.flat();
  const minX = Math.min(...vertices.map((point) => point.x));
  const maxX = Math.max(...vertices.map((point) => point.x));
  const minY = Math.min(...vertices.map((point) => point.y));
  const maxY = Math.max(...vertices.map((point) => point.y));
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const radians = (rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return polygons.map((polygon) =>
    polygon.map((point) => {
      const mirroredX = mirrored ? center.x * 2 - point.x : point.x;
      const x = mirroredX - center.x;
      const y = point.y - center.y;
      return {
        x: center.x + x * cosine - y * sine,
        y: center.y + x * sine + y * cosine,
      };
    }),
  );
}

export interface SilhouetteSimilarity {
  intersectionOverUnion: number;
  missRatio: number;
  extraRatio: number;
}

export function silhouetteSimilarityForLevel(
  figureNumber: number,
  states: PieceState[],
): SilhouetteSimilarity | null {
  const target = targetMasks[figureNumber];
  if (!target) {
    return null;
  }

  const actualRows = rasterizeStates(states, target.size);
  if (!actualRows) {
    return null;
  }

  let intersection = 0;
  let union = 0;
  let actualFilled = 0;
  let targetFilled = 0;

  for (let y = 0; y < target.size; y += 1) {
    for (let x = 0; x < target.size; x += 1) {
      const actual = actualRows[y][x] === "1";
      const expected = target.rows[y][x] === "1";

      if (actual) {
        actualFilled += 1;
      }
      if (expected) {
        targetFilled += 1;
      }
      if (actual && expected) {
        intersection += 1;
      }
      if (actual || expected) {
        union += 1;
      }
    }
  }

  if (union === 0 || actualFilled === 0 || targetFilled === 0) {
    return null;
  }

  return {
    intersectionOverUnion: intersection / union,
    missRatio: (targetFilled - intersection) / targetFilled,
    extraRatio: (actualFilled - intersection) / actualFilled,
  };
}

function matchesTargetSilhouette(
  targetDefinition: TargetDefinition,
  validation: LevelDefinition["validation"],
  states: PieceState[],
  pieces: Record<PieceId, PieceDefinition>,
): boolean {
  if (!targetDefinition.maskFigureNumber) {
    return false;
  }
  const target = targetDefinition.familyId === "gardner"
    ? namedGardnerTargetMasks[targetDefinition.maskFigureNumber]
    : targetMasks[targetDefinition.maskFigureNumber];
  if (!target) {
    return false;
  }

  const rotations = validation.allowGlobalRotation ? [0, 45, 90, 135, 180, 225, 270, 315] : [0];
  const mirrors = validation.allowGlobalMirror ? [false, true] : [false];

  return rotations.some((rotation) =>
    mirrors.some((mirrored) => {
      const actualRows = rasterizePolygons(
        globallyTransformedPolygons(states, rotation, mirrored, pieces),
        target.size,
      );
      if (!actualRows) {
        return false;
      }

      const similarity = compareRasterRows(target.rows, actualRows);
      return Boolean(
        similarity &&
          similarity.intersectionOverUnion >= SILHOUETTE_MATCH_THRESHOLD &&
          similarity.missRatio <= SILHOUETTE_MISS_LIMIT &&
          similarity.extraRatio <= SILHOUETTE_EXTRA_LIMIT,
      );
    }),
  );
}

function statesFromSolution(solution: PieceTransform[]): PieceState[] {
  return solution.map((transform, index) => ({
    pieceId: transform.pieceId,
    position: { x: transform.x, y: transform.y },
    rotation: transform.rotation,
    flipped: transform.flipped,
    zIndex: index + 1,
    groupId: "solution",
    lastValidPosition: { x: transform.x, y: transform.y },
  }));
}

function compareRasterRows(expectedRows: string[], actualRows: string[]): SilhouetteSimilarity | null {
  if (expectedRows.length === 0 || expectedRows.length !== actualRows.length) {
    return null;
  }

  let intersection = 0;
  let union = 0;
  let actualFilled = 0;
  let expectedFilled = 0;

  for (let y = 0; y < expectedRows.length; y += 1) {
    for (let x = 0; x < expectedRows[y].length; x += 1) {
      const actual = actualRows[y][x] === "1";
      const expected = expectedRows[y][x] === "1";

      if (actual) {
        actualFilled += 1;
      }
      if (expected) {
        expectedFilled += 1;
      }
      if (actual && expected) {
        intersection += 1;
      }
      if (actual || expected) {
        union += 1;
      }
    }
  }

  if (union === 0 || actualFilled === 0 || expectedFilled === 0) {
    return null;
  }

  return {
    intersectionOverUnion: intersection / union,
    missRatio: (expectedFilled - intersection) / expectedFilled,
    extraRatio: (actualFilled - intersection) / actualFilled,
  };
}

function matchesSolutionSilhouette(
  solution: PieceTransform[],
  validation: LevelDefinition["validation"],
  states: PieceState[],
  pieces: Record<PieceId, PieceDefinition>,
): boolean {
  const expectedRows = rasterizeStates(statesFromSolution(solution), SOLUTION_SILHOUETTE_SIZE, pieces);
  if (!expectedRows) {
    return false;
  }

  const rotations = validation.allowGlobalRotation ? [0, 45, 90, 135, 180, 225, 270, 315] : [0];
  const mirrors = validation.allowGlobalMirror ? [false, true] : [false];

  return rotations.some((rotation) =>
    mirrors.some((mirrored) => {
      const actualRows = rasterizePolygons(
        globallyTransformedPolygons(states, rotation, mirrored, pieces),
        SOLUTION_SILHOUETTE_SIZE,
      );
      if (!actualRows) {
        return false;
      }

      const similarity = compareRasterRows(expectedRows, actualRows);
      return Boolean(
        similarity &&
          similarity.intersectionOverUnion >= SOLUTION_SILHOUETTE_MATCH_THRESHOLD &&
          similarity.missRatio <= SOLUTION_SILHOUETTE_MISS_LIMIT &&
          similarity.extraRatio <= SOLUTION_SILHOUETTE_EXTRA_LIMIT,
      );
    }),
  );
}

export function isTargetSolved(
  target: TargetDefinition,
  validation: LevelDefinition["validation"],
  states: PieceState[],
): boolean {
  const pieces = piecesByFamily[target.familyId];
  if (states.length !== 4) {
    return false;
  }

  if (hasAnyOverlap(states, pieces)) {
    return false;
  }

  const actual = normalizedTransforms(states);
  const exactSolution = target.solutions.some((solution) =>
    matchesSolution(actual, normalizeSolution(solution), validation.positionTolerance),
  );

  const solutionSilhouette = target.solutions.some((solution) =>
    matchesSolutionSilhouette(solution, validation, states, pieces),
  );

  // Exact transforms are the primary check. The strictly matched silhouette
  // covers allowed whole-figure rotations and mirror images without turning
  // a merely similar arrangement into a success.
  if (target.solutions.length > 0) {
    return exactSolution || solutionSilhouette;
  }

  // Keep mask validation only as a fallback for future targets that have not
  // yet been supplied with a verified four-piece construction.
  return matchesTargetSilhouette(target, validation, states, pieces);
}
