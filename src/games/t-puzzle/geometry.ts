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

function crossProduct(first: Point, second: Point): number {
  return first.x * second.y - first.y * second.x;
}

function pointOnSegment(point: Point, start: Point, end: Point, epsilon: number): boolean {
  const segment = subtract(end, start);
  const relative = subtract(point, start);
  if (Math.abs(crossProduct(segment, relative)) > epsilon) {
    return false;
  }

  const dot = relative.x * segment.x + relative.y * segment.y;
  if (dot < -epsilon) {
    return false;
  }

  return dot <= segment.x ** 2 + segment.y ** 2 + epsilon;
}

function segmentsCrossInside(firstStart: Point, firstEnd: Point, secondStart: Point, secondEnd: Point, epsilon: number): boolean {
  const firstVector = subtract(firstEnd, firstStart);
  const secondVector = subtract(secondEnd, secondStart);
  const determinant = crossProduct(firstVector, secondVector);
  if (Math.abs(determinant) <= epsilon) {
    return false;
  }

  const offset = subtract(secondStart, firstStart);
  const firstFactor = crossProduct(offset, secondVector) / determinant;
  const secondFactor = crossProduct(offset, firstVector) / determinant;
  return (
    firstFactor > epsilon &&
    firstFactor < 1 - epsilon &&
    secondFactor > epsilon &&
    secondFactor < 1 - epsilon
  );
}

function pointInsidePolygon(point: Point, polygon: Point[], epsilon: number): boolean {
  const edges = polygonEdges(polygon);
  if (edges.some((edge) => pointOnSegment(point, edge.start, edge.end, epsilon))) {
    return false;
  }

  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const prior = polygon[previous];
    if ((current.y > point.y) === (prior.y > point.y)) {
      continue;
    }

    const crossingX = ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
    if (point.x < crossingX) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonsOverlap(a: Point[], b: Point[], epsilon = geometryTolerance.epsilon): boolean {
  const aEdges = polygonEdges(a);
  const bEdges = polygonEdges(b);
  if (aEdges.some((first) => bEdges.some((second) =>
    segmentsCrossInside(first.start, first.end, second.start, second.end, epsilon),
  ))) {
    return true;
  }

  // SAT is only valid for convex polygons. The green T-puzzle piece is
  // concave, so use actual edge intersections and strict interior checks.
  return (
    a.some((point) => pointInsidePolygon(point, b, epsilon)) ||
    b.some((point) => pointInsidePolygon(point, a, epsilon)) ||
    pointInsidePolygon(polygonCentroid(a), b, epsilon) ||
    pointInsidePolygon(polygonCentroid(b), a, epsilon)
  );
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
