import { hasAnyOverlap, polygonArea, transformedVertices } from "./geometry";
import { piecesByFamily } from "./pieces";
import { precomputedPuzzleSolutions } from "./verifiedPuzzleSolutions.generated";
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

function rasterKeyForPolygons(polygons: Point[][]): string {
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

function rotatePoint(point: Point, degrees: number, mirrored = false): Point {
  const radians = (degrees * Math.PI) / 180;
  const x = mirrored ? -point.x : point.x;
  return {
    x: x * Math.cos(radians) - point.y * Math.sin(radians),
    y: x * Math.sin(radians) + point.y * Math.cos(radians),
  };
}

function canonicalRasterKey(transforms: PieceTransform[], pieces: PieceMap): string {
  const polygons = transforms.map((transform, index) =>
    transformedVertices(pieces[transform.pieceId], asState(transform, index)),
  );
  const keys = ROTATIONS.flatMap((rotation) =>
    [false, true].map((mirrored) =>
      rasterKeyForPolygons(
        polygons.map((polygon) => polygon.map((point) => rotatePoint(point, rotation, mirrored))),
      ),
    ),
  );
  return keys.sort()[0];
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
  const poolSize = count * 4;
  const results: PieceTransform[][] = [CLASSIC_T];
  const seenShapes = new Set([canonicalRasterKey(CLASSIC_T, pieces)]);
  const remainingPieceOrders = permutations(PIECE_IDS.filter((pieceId) => pieceId !== "blue-bar"));

  const visit = (placed: PieceTransform[], remaining: PieceId[], orderLimit: number): void => {
    if (results.length >= orderLimit) {
      return;
    }
    if (remaining.length === 0) {
      const key = canonicalRasterKey(placed, pieces);
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
  const scored = generated.sort(
    (first, second) => complexityScore(first, pieces) - complexityScore(second, pieces),
  );
  const selected = Array.from({ length: count - 1 }, (_, index) => {
    const position = Math.round((index * (scored.length - 1)) / Math.max(count - 2, 1));
    const rotations = [90, 270, 45, 180, 315, 135, 225, 0] as const;
    return rotateSolution(scored[position], rotations[index % rotations.length], pieces);
  });

  return [classic, ...selected];
}

function rotateSolution(
  solution: PieceTransform[],
  degrees: PieceRotation,
  pieces: PieceMap,
): PieceTransform[] {
  return solution.map((piece) => {
    const centroid = pieces[piece.pieceId].centroid;
    const rotatedAnchor = rotatePoint(
      { x: centroid.x + piece.x, y: centroid.y + piece.y },
      degrees,
    );
    return {
      ...piece,
      rotation: ((piece.rotation + degrees) % 360) as PieceRotation,
      x: rotatedAnchor.x - centroid.x,
      y: rotatedAnchor.y - centroid.y,
    };
  });
}

function complexityScore(solution: PieceTransform[], pieces: PieceMap): number {
  const states = solution.map(asState);
  const polygons = states.map((state) => transformedVertices(pieces[state.pieceId], state));
  const vertices = polygons.flat();
  const minX = Math.min(...vertices.map((point) => point.x));
  const maxX = Math.max(...vertices.map((point) => point.x));
  const minY = Math.min(...vertices.map((point) => point.y));
  const maxY = Math.max(...vertices.map((point) => point.y));
  const width = maxX - minX;
  const height = maxY - minY;
  const totalArea = polygons.reduce((sum, polygon) => sum + polygonArea(polygon), 0);
  const compactnessPenalty = (width * height) / totalArea;
  const rotationVariety = new Set(solution.map((piece) => piece.rotation)).size;
  const diagonalRotations = solution.filter((piece) => piece.rotation % 90 !== 0).length;
  const flippedPieces = solution.filter((piece) => piece.flipped).length;
  const contactPairs = polygons.reduce((count, polygon, firstIndex) =>
    count + polygons.slice(firstIndex + 1).filter((other) =>
      edges(polygon).some((firstEdge) =>
        edges(other).some((secondEdge) =>
          sharedEdgeLength(firstEdge.start, firstEdge.end, secondEdge.start, secondEdge.end) >= MIN_SHARED_EDGE,
        ),
      ),
    ).length, 0);
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const blueVertices = polygons[solution.findIndex((piece) => piece.pieceId === "blue-bar")];
  const blueCenter = {
    x: blueVertices.reduce((sum, point) => sum + point.x, 0) / blueVertices.length,
    y: blueVertices.reduce((sum, point) => sum + point.y, 0) / blueVertices.length,
  };
  const blueOffset = Math.hypot(blueCenter.x - center.x, blueCenter.y - center.y) / Math.max(width, height);
  return (
    compactnessPenalty * 8 +
    rotationVariety * 4 +
    diagonalRotations * 3 +
    flippedPieces * 2 +
    Math.max(0, 5 - contactPairs) * 4 +
    blueOffset * 12
  );
}

export function generateVerifiedPuzzleSolutions(
  familyId: PuzzleFamilyId,
  count = 102,
): PieceTransform[][] {
  return buildVerifiedPuzzles(count, piecesByFamily[familyId]);
}

export function getVerifiedPuzzleSolutions(familyId: PuzzleFamilyId): PieceTransform[][] {
  return precomputedPuzzleSolutions[familyId];
}

export const verifiedPuzzleSolutions = precomputedPuzzleSolutions.gardner;
