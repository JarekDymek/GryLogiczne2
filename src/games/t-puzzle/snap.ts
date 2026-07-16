import { add, distance, hasAnyOverlap, polygonEdges, transformedVertices } from "./geometry";
import { geometryTolerance } from "./config";
import type { PieceDefinition, PieceId, PieceState, Point, SnapResult } from "./types";

interface SnapCandidate extends SnapResult {
  score: number;
  sharedLength: number;
  movement: number;
}

function edgeAlignmentCandidate(
  activeStart: Point,
  activeEnd: Point,
  passiveStart: Point,
  passiveEnd: Point,
  targetGroupId: string,
): SnapCandidate | null {
  const activeVector = {
    x: activeEnd.x - activeStart.x,
    y: activeEnd.y - activeStart.y,
  };
  const passiveVector = {
    x: passiveEnd.x - passiveStart.x,
    y: passiveEnd.y - passiveStart.y,
  };
  const activeLength = Math.hypot(activeVector.x, activeVector.y);
  const passiveLength = Math.hypot(passiveVector.x, passiveVector.y);
  if (activeLength === 0 || passiveLength === 0) {
    return null;
  }

  const parallelError = Math.abs(
    (activeVector.x * passiveVector.y - activeVector.y * passiveVector.x) /
      (activeLength * passiveLength),
  );
  if (parallelError > 0.025) {
    return null;
  }

  const tangent = {
    x: passiveVector.x / passiveLength,
    y: passiveVector.y / passiveLength,
  };
  const normal = { x: -tangent.y, y: tangent.x };
  const signedDistance =
    (activeStart.x - passiveStart.x) * normal.x +
    (activeStart.y - passiveStart.y) * normal.y;
  const alignmentDistance = Math.abs(signedDistance);
  if (alignmentDistance > geometryTolerance.snapDistance) {
    return null;
  }

  const normalDelta = {
    x: -signedDistance * normal.x,
    y: -signedDistance * normal.y,
  };
  const alignedStart = add(activeStart, normalDelta);
  const alignedEnd = add(activeEnd, normalDelta);
  const startProjection =
    (alignedStart.x - passiveStart.x) * tangent.x +
    (alignedStart.y - passiveStart.y) * tangent.y;
  const endProjection =
    (alignedEnd.x - passiveStart.x) * tangent.x +
    (alignedEnd.y - passiveStart.y) * tangent.y;
  const overlapLength =
    Math.min(Math.max(startProjection, endProjection), passiveLength) -
    Math.max(Math.min(startProjection, endProjection), 0);
  if (overlapLength < geometryTolerance.minSharedContact) {
    return null;
  }

  const tangentCorrections = [
    -startProjection,
    passiveLength - startProjection,
    -endProjection,
    passiveLength - endProjection,
  ].sort((first, second) => Math.abs(first) - Math.abs(second));
  const endpointCorrection = Math.abs(tangentCorrections[0]) <= geometryTolerance.snapDistance
    ? tangentCorrections[0]
    : 0;
  const delta = {
    x: normalDelta.x + endpointCorrection * tangent.x,
    y: normalDelta.y + endpointCorrection * tangent.y,
  };

  return {
    delta,
    targetGroupId,
    contact: "edge",
    score: Math.hypot(alignmentDistance, endpointCorrection) - overlapLength * 0.08,
    sharedLength: overlapLength,
    movement: Math.hypot(delta.x, delta.y),
  };
}

function pointOnEdgeCandidate(
  point: Point,
  edgeStart: Point,
  edgeEnd: Point,
): Point | null {
  const edge = {
    x: edgeEnd.x - edgeStart.x,
    y: edgeEnd.y - edgeStart.y,
  };
  const edgeLengthSquared = edge.x ** 2 + edge.y ** 2;
  if (edgeLengthSquared === 0) {
    return null;
  }

  const projection =
    ((point.x - edgeStart.x) * edge.x + (point.y - edgeStart.y) * edge.y) / edgeLengthSquared;
  if (projection < -geometryTolerance.epsilon || projection > 1 + geometryTolerance.epsilon) {
    return null;
  }

  const closest = {
    x: edgeStart.x + Math.min(1, Math.max(0, projection)) * edge.x,
    y: edgeStart.y + Math.min(1, Math.max(0, projection)) * edge.y,
  };
  return distance(point, closest) < geometryTolerance.vertexSnapDistance ? closest : null;
}

export function applyDeltaToStates(states: PieceState[], pieceIds: Set<string>, delta: Point): PieceState[] {
  return states.map((state) =>
    pieceIds.has(state.pieceId)
      ? {
          ...state,
          position: add(state.position, delta),
        }
      : state,
  );
}

export function findSnap(
  states: PieceState[],
  pieces: Record<PieceId, PieceDefinition>,
  activePieceIds: Set<string>,
): SnapResult | null {
  const activeStates = states.filter((state) => activePieceIds.has(state.pieceId));
  const passiveStates = states.filter((state) => !activePieceIds.has(state.pieceId));
  const candidates: SnapCandidate[] = [];

  for (const active of activeStates) {
    const activeVertices = transformedVertices(pieces[active.pieceId], active);
    const activeEdges = polygonEdges(activeVertices);
    for (const passive of passiveStates) {
      const passiveVertices = transformedVertices(pieces[passive.pieceId], passive);
      const passiveEdges = polygonEdges(passiveVertices);

      for (const activeEdge of activeEdges) {
        for (const passiveEdge of passiveEdges) {
          const edgeCandidate = edgeAlignmentCandidate(
            activeEdge.start,
            activeEdge.end,
            passiveEdge.start,
            passiveEdge.end,
            passive.groupId,
          );
          if (edgeCandidate) {
            candidates.push(edgeCandidate);
          }
        }
      }

      for (const activeVertex of activeVertices) {
        for (const passiveVertex of passiveVertices) {
          const candidateDistance = distance(activeVertex, passiveVertex);
          if (candidateDistance < geometryTolerance.vertexSnapDistance) {
            candidates.push({
              delta: {
                x: passiveVertex.x - activeVertex.x,
                y: passiveVertex.y - activeVertex.y,
              },
              targetGroupId: passive.groupId,
              contact: "vertex",
              score: candidateDistance + 0.04,
              sharedLength: 0,
              movement: candidateDistance,
            });
          }
        }

        for (const passiveEdge of passiveEdges) {
          const closest = pointOnEdgeCandidate(activeVertex, passiveEdge.start, passiveEdge.end);
          if (!closest) {
            continue;
          }
          const delta = {
            x: closest.x - activeVertex.x,
            y: closest.y - activeVertex.y,
          };
          candidates.push({
            delta,
            targetGroupId: passive.groupId,
            contact: "vertex",
            score: Math.hypot(delta.x, delta.y) + 0.02,
            sharedLength: 0,
            movement: Math.hypot(delta.x, delta.y),
          });
        }
      }

      for (const passiveVertex of passiveVertices) {
        for (const activeEdge of activeEdges) {
          const closest = pointOnEdgeCandidate(passiveVertex, activeEdge.start, activeEdge.end);
          if (!closest) {
            continue;
          }
          const delta = {
            x: passiveVertex.x - closest.x,
            y: passiveVertex.y - closest.y,
          };
          candidates.push({
            delta,
            targetGroupId: passive.groupId,
            contact: "vertex",
            score: Math.hypot(delta.x, delta.y) + 0.02,
            sharedLength: 0,
            movement: Math.hypot(delta.x, delta.y),
          });
        }
      }
    }
  }

  candidates.sort((first, second) => {
    // A nearby correct edge must win over a more distant, unrelated one.
    // This prevents a tile already touching its intended neighbour from
    // jumping away to another valid-looking contact.
    const movementDifference = first.movement - second.movement;
    // Within a short, finger-sized range, a shared edge is more useful than
    // a single point: it visibly aligns the two tiles. Do not let that rule
    // pull a tile away from an already exact vertex-to-edge T junction.
    if (Math.abs(movementDifference) > geometryTolerance.snapDistance * 0.25) {
      return movementDifference;
    }
    if (first.contact !== second.contact) {
      return first.contact === "edge" ? -1 : 1;
    }
    return first.score - second.score || second.sharedLength - first.sharedLength;
  });
  for (const candidate of candidates) {
    const snapped = applyDeltaToStates(states, activePieceIds, candidate.delta);
    if (!hasAnyOverlap(snapped, pieces, activePieceIds)) {
      return {
        delta: candidate.delta,
        targetGroupId: candidate.targetGroupId,
        contact: candidate.contact,
      };
    }
  }

  return null;
}
