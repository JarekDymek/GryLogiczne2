import { gestureConfig } from "./gestureConfig";
import type { Point } from "./types";

interface PointerPhase {
  pieceId: string;
  pointerId: number;
  origin: Point;
  startedAt: number;
  movementTolerance: number;
}

export type DetachGestureState =
  | { kind: "idle" }
  | ({ kind: "firstPointerDown" } & PointerPhase)
  | { kind: "firstTapCompleted"; pieceId: string; completedAt: number }
  | ({ kind: "holdPending" } & PointerPhase)
  | {
      kind: "detachedDragging";
      pieceId: string;
      pointerId: number;
      detachedAt: number;
    }
  | { kind: "cancelled"; pointerId: number | null };

export interface DetachPointerInput {
  pieceId: string;
  pointerId: number;
  point: Point;
  now: number;
  movementTolerance: number;
}

export const idleDetachGesture: DetachGestureState = { kind: "idle" };

function movedTooFar(origin: Point, point: Point, tolerance: number): boolean {
  return Math.hypot(point.x - origin.x, point.y - origin.y) > tolerance;
}

export function beginDetachGesture(
  state: DetachGestureState,
  input: DetachPointerInput,
): DetachGestureState {
  const repeatsFirstTap =
    state.kind === "firstTapCompleted" &&
    state.pieceId === input.pieceId &&
    input.now - state.completedAt >= 0 &&
    input.now - state.completedAt <= gestureConfig.detach.doubleTapMaxDelayMs;

  if (repeatsFirstTap) {
    return {
      kind: "holdPending",
      pieceId: input.pieceId,
      pointerId: input.pointerId,
      origin: input.point,
      startedAt: input.now,
      movementTolerance: input.movementTolerance,
    };
  }

  return {
    kind: "firstPointerDown",
    pieceId: input.pieceId,
    pointerId: input.pointerId,
    origin: input.point,
    startedAt: input.now,
    movementTolerance: input.movementTolerance,
  };
}

export function moveDetachGesture(
  state: DetachGestureState,
  pointerId: number,
  point: Point,
): DetachGestureState {
  if (
    (state.kind !== "firstPointerDown" && state.kind !== "holdPending") ||
    state.pointerId !== pointerId
  ) {
    return state;
  }
  return movedTooFar(state.origin, point, state.movementTolerance)
    ? { kind: "cancelled", pointerId }
    : state;
}

export function advanceDetachGesture(
  state: DetachGestureState,
  now: number,
): DetachGestureState {
  if (
    state.kind === "firstTapCompleted" &&
    now - state.completedAt > gestureConfig.detach.doubleTapMaxDelayMs
  ) {
    return idleDetachGesture;
  }
  if (
    state.kind === "holdPending" &&
    now - state.startedAt >= gestureConfig.detach.secondHoldMs
  ) {
    return {
      kind: "detachedDragging",
      pieceId: state.pieceId,
      pointerId: state.pointerId,
      detachedAt: now,
    };
  }
  return state;
}

export function releaseDetachGesture(
  state: DetachGestureState,
  pointerId: number,
  now: number,
): DetachGestureState {
  if (state.kind === "firstPointerDown" && state.pointerId === pointerId) {
    return now - state.startedAt <= gestureConfig.detach.firstTapMaxDurationMs
      ? { kind: "firstTapCompleted", pieceId: state.pieceId, completedAt: now }
      : idleDetachGesture;
  }
  if (
    (state.kind === "holdPending" || state.kind === "detachedDragging") &&
    state.pointerId === pointerId
  ) {
    return idleDetachGesture;
  }
  if (state.kind === "cancelled" && (state.pointerId === null || state.pointerId === pointerId)) {
    return idleDetachGesture;
  }
  return state;
}

export function cancelDetachGesture(
  state: DetachGestureState,
  pointerId?: number,
): DetachGestureState {
  if (
    pointerId !== undefined &&
    "pointerId" in state &&
    state.pointerId !== null &&
    state.pointerId !== pointerId
  ) {
    return state;
  }
  return { kind: "cancelled", pointerId: pointerId ?? null };
}
