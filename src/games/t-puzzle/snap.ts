import { add, distance, hasAnyOverlap, polygonEdges, transformedVertices } from "./geometry";
import { geometryTolerance } from "./config";
import type { PieceDefinition, PieceId, PieceState, Point, SnapResult } from "./types";

interface SnapCandidate extends SnapResult {
  score: number;
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

  const delta = {
    x: -signedDistance * normal.x,
    y: -signedDistance * normal.y,
  };
  const alignedStart = add(activeStart, delta);
  const alignedEnd = add(activeEnd, delta);
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

  return {
    delta,
    targetGroupId,
    score: alignmentDistance,
  };
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
              score: candidateDistance + 0.04,
            });
          }
        }
      }
    }
  }

  candidates.sort((first, second) => first.score - second.score);
  for (const candidate of candidates) {
    const snapped = applyDeltaToStates(states, activePieceIds, candidate.delta);
    if (!hasAnyOverlap(snapped, pieces, activePieceIds)) {
      return {
        delta: candidate.delta,
        targetGroupId: candidate.targetGroupId,
      };
    }
  }

  return null;
}
