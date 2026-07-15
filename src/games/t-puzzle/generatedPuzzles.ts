import { hasAnyOverlap, transformedVertices } from "./geometry";
import { piecesByFamily } from "./pieces";
import type { PieceDefinition, PieceId, PieceRotation, PieceState, PieceTransform, Point, PuzzleFamilyId } from "./types";

const ROTATIONS: PieceRotation[] = [0, 45, 90, 135, 180, 225, 270, 315];
const PIECE_IDS: PieceId[] = ["blue-bar", "green-wing", "pink-keystone", "yellow-cap"];
const MIN_SHARED_EDGE = 0.2;
const EPSILON = 0.00001;
const CLASSIC_T: PieceTransform[] = PIECE_IDS.map((pieceId) => ({
  pieceId,
  x: 0,
  y: 0,
  rotation: 0,
  flipped: false,
}));

interface OrientedPiece {
  pieceId: PieceId;
  rotation: PieceRotation;
  flipped: boolean;
  vertices: Point[];
}

type PieceMap = Record<PieceId, PieceDefinition>;

function asState(transform: PieceTransform, zIndex: number): PieceState {
  return {
    pieceId: transform.pieceId,
    position: { x: transform.x, y: transform.y },
    rotation: transform.rotation,
    flipped: transform.flipped,
    zIndex,
    groupId: "verification",
    lastValidPosition: { x: transform.x, y: transform.y },
  };
}

function orientedPieces(pieceId: PieceId, pieces: PieceMap): OrientedPiece[] {
  return ROTATIONS.flatMap((rotation) =>
    [false, true].map((flipped) => ({
      pieceId,
      rotation,
      flipped,
      vertices: transformedVertices(pieces[pieceId], asState({ pieceId, x: 0, y: 0, rotation, flipped }, 0)),
    })),
  );
}

function edges(vertices: Point[]): Array<{ start: Point; end: Point }> {
  return vertices.map((start, index) => ({ end: vertices[(index + 1) % vertices.length], start }));
}

function translated(vertices: Point[], position: Point): Point[] {
  return vertices.map((vertex) => ({ x: vertex.x + position.x, y: vertex.y + position.y }));
}

function cross(first: Point, second: Point): number {
  return first.x * second.y - first.y * second.x;
}

function subtract(first: Point, second: Point): Point {
  return { x: first.x - second.x, y: first.y - second.y };
}

function sharedEdgeLength(firstStart: Point, firstEnd: Point, secondStart: Point, secondEnd: Point): number {
  const firstVector = subtract(firstEnd, firstStart);
  const secondVector = subtract(secondEnd, secondStart);
  const firstLength = Math.hypot(firstVector.x, firstVector.y);
  const secondLength = Math.hypot(secondVector.x, secondVector.y);
  if (firstLength < EPSILON || secondLength < EPSILON) {
    return 0;
  }

  if (Math.abs(cross(firstVector, secondVector)) > EPSILON) {
    return 0;
  }
  if (Math.abs(cross(firstVector, subtract(secondStart, firstStart))) > EPSILON) {
    return 0;
  }

  const axis = { x: firstVector.x / firstLength, y: firstVector.y / firstLength };
  const firstRange = [0, firstLength];
  const secondRange = [
    (secondStart.x - firstStart.x) * axis.x + (secondStart.y - firstStart.y) * axis.y,
    (secondEnd.x - firstStart.x) * axis.x + (secondEnd.y - firstStart.y) * axis.y,
  ].sort((a, b) => a - b);
  return Math.max(0, Math.min(firstRange[1], secondRange[1]) - Math.max(firstRange[0], secondRange[0]));
}

function hasSharedEdge(newVertices: Point[], placed: PieceTransform[], pieces: PieceMap): boolean {
  const newEdges = edges(newVertices);
  return placed.some((transform, index) => {
    const existingVertices = transformedVertices(pieces[transform.pieceId], asState(transform, index));
    return newEdges.some((newEdge) =>
      edges(existingVertices).some(
        (existingEdge) =>
          sharedEdgeLength(newEdge.start, newEdge.end, existingEdge.start, existingEdge.end) >= MIN_SHARED_EDGE,
      ),
    );
  });
}

function candidateAttachments(pieceId: PieceId, placed: PieceTransform[], pieces: PieceMap): PieceTransform[] {
  const candidates = new Map<string, PieceTransform>();

  for (const orientation of orientedPieces(pieceId, pieces)) {
    for (const transform of placed) {
      const existingVertices = transformedVertices(pieces[transform.pieceId], asState(transform, 0));
      for (const existingEdge of edges(existingVertices)) {
        for (const newEdge of edges(orientation.vertices)) {
          for (const [existingPoint, newPoint] of [
            [existingEdge.start, newEdge.start],
            [existingEdge.start, newEdge.end],
            [existingEdge.end, newEdge.start],
            [existingEdge.end, newEdge.end],
          ]) {
            const candidate = {
              pieceId,
              rotation: orientation.rotation,
              flipped: orientation.flipped,
              x: existingPoint.x - newPoint.x,
              y: existingPoint.y - newPoint.y,
            };
            const vertices = translated(orientation.vertices, candidate);
            const states = [...placed, candidate].map(asState);
            if (hasAnyOverlap(states, pieces) || !hasSharedEdge(vertices, placed, pieces)) {
              continue;
            }

            const key = [candidate.rotation, candidate.flipped, candidate.x.toFixed(5), candidate.y.toFixed(5)].join(":");
            candidates.set(key, candidate);
          }
        }
      }
    }
  }

  return [...candidates.values()].sort((first, second) => {
    const firstScore = Math.abs(first.x) + Math.abs(first.y);
    const secondScore = Math.abs(second.x) + Math.abs(second.y);
    return firstScore - secondScore || first.rotation - second.rotation;
  });
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if (currentPoint.y > point.y !== previousPoint.y > point.y) {
      const crossingX =
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
        currentPoint.x;
      if (point.x < crossingX) {
        inside = !inside;
      }
    }
  }
  return inside;
}

function rasterKey(transforms: PieceTransform[], pieces: PieceMap): string {
  const polygons = transforms.map((transform, index) =>
    transformedVertices(pieces[transform.pieceId], asState(transform, index)),
  );
  const points = polygons.flat();
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = maxX - minX;
  const height = maxY - minY;
  const scale = 28 / Math.max(width, height);

  return Array.from({ length: 28 }, (_, row) =>
    Array.from({ length: 28 }, (_, column) => {
      const point = {
        x: minX + ((column + 0.5) / 28) * Math.max(width, height),
        y: minY + ((row + 0.5) / 28) * Math.max(width, height),
      };
      return polygons.some((polygon) => pointInPolygon(point, polygon)) ? "1" : "0";
    }).join(""),
  ).join("") + `:${Math.round(width * scale)}:${Math.round(height * scale)}`;
}

function permutations(values: PieceId[]): PieceId[][] {
  if (values.length <= 1) {
    return [values];
  }
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((tail) => [value, ...tail]),
  );
}

function buildVerifiedPuzzles(count: number, pieces: PieceMap): PieceTransform[][] {
  const poolSize = count * 2;
  const results: PieceTransform[][] = [CLASSIC_T];
  const seenShapes = new Set([rasterKey(CLASSIC_T, pieces)]);
  const remainingPieceOrders = permutations(PIECE_IDS.filter((pieceId) => pieceId !== "blue-bar"));

  const visit = (placed: PieceTransform[], remaining: PieceId[], orderLimit: number): void => {
    if (results.length >= orderLimit) {
      return;
    }
    if (remaining.length === 0) {
      const key = rasterKey(placed, pieces);
      if (!seenShapes.has(key)) {
        seenShapes.add(key);
        results.push(placed);
      }
      return;
    }

    const [nextPiece, ...tail] = remaining;
    for (const candidate of candidateAttachments(nextPiece, placed, pieces)) {
      visit([...placed, candidate], tail, orderLimit);
      if (results.length >= orderLimit) {
        return;
      }
    }
  };

  for (const order of remainingPieceOrders) {
    const orderLimit = Math.min(poolSize, results.length + Math.ceil(poolSize / remainingPieceOrders.length));
    visit([{ pieceId: "blue-bar", x: 0, y: 0, rotation: 0, flipped: false }], order, orderLimit);
    if (results.length >= poolSize) {
      break;
    }
  }

  if (results.length < count) {
    throw new Error(`Wygenerowano ${results.length}/${count} poprawnych figur T-puzzle.`);
  }

  const [classic, ...generated] = results;
  const scored = generated.sort((first, second) => complexityScore(first) - complexityScore(second));
  const selected = Array.from({ length: count - 1 }, (_, index) => {
    const position = Math.round((index * (scored.length - 1)) / Math.max(count - 2, 1));
    return scored[position];
  });

  return [classic, ...selected];
}

function complexityScore(solution: PieceTransform[]): number {
  const rotationVariety = new Set(solution.map((piece) => piece.rotation)).size;
  const diagonalRotations = solution.filter((piece) => piece.rotation % 90 !== 0).length;
  const flippedPieces = solution.filter((piece) => piece.flipped).length;
  const positions = solution.map((piece) => ({ x: piece.x, y: piece.y }));
  const width = Math.max(...positions.map((point) => point.x)) - Math.min(...positions.map((point) => point.x));
  const height = Math.max(...positions.map((point) => point.y)) - Math.min(...positions.map((point) => point.y));
  const elongation = Math.abs(width - height);
  return rotationVariety * 5 + diagonalRotations * 3 + flippedPieces * 2 + elongation;
}

const verifiedPuzzleCache: Partial<Record<PuzzleFamilyId, PieceTransform[][]>> = {};

export function getVerifiedPuzzleSolutions(familyId: PuzzleFamilyId): PieceTransform[][] {
  if (!verifiedPuzzleCache[familyId]) {
    verifiedPuzzleCache[familyId] = buildVerifiedPuzzles(102, piecesByFamily[familyId]);
  }
  return verifiedPuzzleCache[familyId]!;
}

export const verifiedPuzzleSolutions = getVerifiedPuzzleSolutions("gardner");
