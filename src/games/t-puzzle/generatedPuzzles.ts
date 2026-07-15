import { hasAnyOverlap, transformedVertices } from "./geometry";
import { piecesById } from "./pieces";
import type { PieceId, PieceRotation, PieceState, PieceTransform, Point } from "./types";

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

function orientedPieces(pieceId: PieceId): OrientedPiece[] {
  return ROTATIONS.flatMap((rotation) =>
    [false, true].map((flipped) => ({
      pieceId,
      rotation,
      flipped,
      vertices: transformedVertices(piecesById[pieceId], asState({ pieceId, x: 0, y: 0, rotation, flipped }, 0)),
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

function hasSharedEdge(newVertices: Point[], placed: PieceTransform[]): boolean {
  const newEdges = edges(newVertices);
  return placed.some((transform, index) => {
    const existingVertices = transformedVertices(piecesById[transform.pieceId], asState(transform, index));
    return newEdges.some((newEdge) =>
      edges(existingVertices).some(
        (existingEdge) =>
          sharedEdgeLength(newEdge.start, newEdge.end, existingEdge.start, existingEdge.end) >= MIN_SHARED_EDGE,
      ),
    );
  });
}

function candidateAttachments(pieceId: PieceId, placed: PieceTransform[]): PieceTransform[] {
  const candidates = new Map<string, PieceTransform>();

  for (const orientation of orientedPieces(pieceId)) {
    for (const transform of placed) {
      const existingVertices = transformedVertices(piecesById[transform.pieceId], asState(transform, 0));
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
            if (hasAnyOverlap(states, piecesById) || !hasSharedEdge(vertices, placed)) {
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

function rasterKey(transforms: PieceTransform[]): string {
  const polygons = transforms.map((transform, index) =>
    transformedVertices(piecesById[transform.pieceId], asState(transform, index)),
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

function buildVerifiedPuzzles(count: number): PieceTransform[][] {
  const results: PieceTransform[][] = [CLASSIC_T];
  const seenShapes = new Set([rasterKey(CLASSIC_T)]);
  const remainingPieceOrders = permutations(PIECE_IDS.filter((pieceId) => pieceId !== "blue-bar"));

  const visit = (placed: PieceTransform[], remaining: PieceId[]): void => {
    if (results.length >= count) {
      return;
    }
    if (remaining.length === 0) {
      const key = rasterKey(placed);
      if (!seenShapes.has(key)) {
        seenShapes.add(key);
        results.push(placed);
      }
      return;
    }

    const [nextPiece, ...tail] = remaining;
    for (const candidate of candidateAttachments(nextPiece, placed)) {
      visit([...placed, candidate], tail);
      if (results.length >= count) {
        return;
      }
    }
  };

  for (const order of remainingPieceOrders) {
    visit([{ pieceId: "blue-bar", x: 0, y: 0, rotation: 0, flipped: false }], order);
    if (results.length >= count) {
      break;
    }
  }

  if (results.length !== count) {
    throw new Error(`Wygenerowano ${results.length}/${count} poprawnych figur T-puzzle.`);
  }

  return results;
}

export const verifiedPuzzleSolutions = buildVerifiedPuzzles(102);
