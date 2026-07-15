import { add, distance, transformedVertices } from "./geometry";
import { geometryTolerance } from "./config";
import type { PieceDefinition, PieceId, PieceState, Point, SnapResult } from "./types";

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
  let best: SnapResult | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const active of activeStates) {
    const activeVertices = transformedVertices(pieces[active.pieceId], active);
    for (const passive of passiveStates) {
      const passiveVertices = transformedVertices(pieces[passive.pieceId], passive);
      for (const activeVertex of activeVertices) {
        for (const passiveVertex of passiveVertices) {
          const candidateDistance = distance(activeVertex, passiveVertex);
          if (
            candidateDistance < geometryTolerance.vertexSnapDistance &&
            candidateDistance < bestDistance
          ) {
            bestDistance = candidateDistance;
            best = {
              delta: {
                x: passiveVertex.x - activeVertex.x,
                y: passiveVertex.y - activeVertex.y,
              },
              targetGroupId: passive.groupId,
            };
          }
        }
      }
    }
  }

  if (best) {
    return best;
  }

  return null;
}
