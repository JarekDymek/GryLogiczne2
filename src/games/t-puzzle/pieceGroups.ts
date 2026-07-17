import type { PieceState } from "./types";

export type SnapLocks = Readonly<Record<string, number>>;

export function pieceGroupIds(states: PieceState[], pieceId: string): Set<string> {
  const groupId = states.find((state) => state.pieceId === pieceId)?.groupId;
  if (!groupId) {
    return new Set();
  }
  return new Set(
    states.filter((state) => state.groupId === groupId).map((state) => state.pieceId),
  );
}

export function isPieceGrouped(states: PieceState[], pieceId: string): boolean {
  return pieceGroupIds(states, pieceId).size > 1;
}

export function detachPiece(
  states: PieceState[],
  pieceId: string,
  detachedGroupId: string,
): PieceState[] {
  return states.map((state) =>
    state.pieceId === pieceId ? { ...state, groupId: detachedGroupId } : state,
  );
}

export function withSnapLock(
  locks: SnapLocks,
  pieceId: string,
  until: number,
): SnapLocks {
  return { ...locks, [pieceId]: until };
}

export function isSnapLocked(locks: SnapLocks, pieceId: string, now: number): boolean {
  return (locks[pieceId] ?? 0) > now;
}
