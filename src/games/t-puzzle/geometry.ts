import type { Edge, FlipAxis, PieceDefinition, PieceId, PieceState, Point } from "./types";
import { geometryTolerance } from "./config";

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(point: Point, factor: number): Point {
  return { x: point.x * factor, y: point.y * factor };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function polygonArea(vertices: Point[]): number {
  const sum = vertices.reduce((acc, point, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return acc + point.x * next.y - next.x * point.y;
  }, 0);
  return Math.abs(sum) / 2;
}

export function polygonCentroid(vertices: Point[]): Point {
  const signedArea = vertices.reduce((acc, point, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return acc + point.x * next.y - next.x * point.y;
  }, 0) / 2;

  const factor = 1 / (6 * signedArea);
  const centroid = vertices.reduce(
    (acc, point, index) => {
      const next = vertices[(index + 1) % vertices.length];
      const cross = point.x * next.y - next.x * point.y;
      return {
        x: acc.x + (point.x + next.x) * cross,
        y: acc.y + (point.y + next.y) * cross,
      };
    },
    { x: 0, y: 0 },
  );

  return scale(centroid, factor);
}

export function polygonEdges(vertices: Point[]): Edge[] {
  return vertices.map((point, index) => ({
    start: point,
    end: vertices[(index + 1) % vertices.length],
  }));
}

function rotateAround(point: Point, center: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: center.y + dx * Math.sin(radians) + dy * Math.cos(radians),
  };
}

function reflectAcrossAxis(point: Point, axis: FlipAxis): Point {
  const axisVector = subtract(axis.end, axis.start);
  const pointVector = subtract(point, axis.start);
  const axisLengthSquared = axisVector.x ** 2 + axisVector.y ** 2;
  const projection = (pointVector.x * axisVector.x + pointVector.y * axisVector.y) / axisLengthSquared;
  const foot = add(axis.start, scale(axisVector, projection));
  return {
    x: 2 * foot.x - point.x,
    y: 2 * foot.y - point.y,
  };
}

export function transformPoint(point: Point, piece: PieceDefinition, state: PieceState): Point {
  const reflected = state.flipped ? reflectAcrossAxis(point, piece.flipAxis) : point;
  const rotated = rotateAround(reflected, piece.centroid, state.rotation);
  return add(rotated, state.position);
}

export function transformedVertices(piece: PieceDefinition, state: PieceState): Point[] {
  return piece.vertices.map((vertex) => transformPoint(vertex, piece, state));
}

export function transformedEdges(piece: PieceDefinition, state: PieceState): Edge[] {
  return polygonEdges(transformedVertices(piece, state));
}

function projection(vertices: Point[], axis: Point): { min: number; max: number } {
  return vertices.reduce(
    (range, vertex) => {
      const value = vertex.x * axis.x + vertex.y * axis.y;
      return {
        min: Math.min(range.min, value),
        max: Math.max(range.max, value),
      };
    },
    { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  );
}

function axesFor(vertices: Point[]): Point[] {
  return polygonEdges(vertices).map((edge) => {
    const vector = subtract(edge.end, edge.start);
    const length = Math.hypot(vector.x, vector.y);
    return { x: -vector.y / length, y: vector.x / length };
  });
}

export function polygonsOverlap(a: Point[], b: Point[], epsilon = geometryTolerance.epsilon): boolean {
  for (const axis of [...axesFor(a), ...axesFor(b)]) {
    const rangeA = projection(a, axis);
    const rangeB = projection(b, axis);
    if (rangeA.max <= rangeB.min + epsilon || rangeB.max <= rangeA.min + epsilon) {
      return false;
    }
  }
  return true;
}

export function hasAnyOverlap(
  states: PieceState[],
  pieces: Record<PieceId, PieceDefinition>,
  activeIds?: Set<string>,
): boolean {
  for (let i = 0; i < states.length; i += 1) {
    for (let j = i + 1; j < states.length; j += 1) {
      if (activeIds && !activeIds.has(states[i].pieceId) && !activeIds.has(states[j].pieceId)) {
        continue;
      }
      const first = transformedVertices(pieces[states[i].pieceId], states[i]);
      const second = transformedVertices(pieces[states[j].pieceId], states[j]);
      if (polygonsOverlap(first, second)) {
        return true;
      }
    }
  }
  return false;
}

export function pointsAlmostEqual(a: Point, b: Point, tolerance: number): boolean {
  return distance(a, b) <= tolerance;
}

export function pathFromPoints(points: Point[]): string {
  return points.map((point) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(" ");
}
