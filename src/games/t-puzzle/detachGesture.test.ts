import { describe, expect, it } from "vitest";
import {
  advanceDetachGesture,
  beginDetachGesture,
  cancelDetachGesture,
  idleDetachGesture,
  moveDetachGesture,
  releaseDetachGesture,
} from "./detachGesture";
import { gestureConfig } from "./gestureConfig";
import { detachPiece, isSnapLocked, pieceGroupIds, withSnapLock } from "./pieceGroups";
import type { PieceId, PieceState } from "./types";

const point = { x: 10, y: 10 };

function pointer(pieceId: string, now: number, pointerId = 1) {
  return { pieceId, pointerId, point, now, movementTolerance: 10 };
}

function completedFirstTap(pieceId = "blue-bar", completedAt = 100) {
  const down = beginDetachGesture(idleDetachGesture, pointer(pieceId, 50));
  return releaseDetachGesture(down, 1, completedAt);
}

function state(pieceId: PieceId, groupId: string): PieceState {
  return {
    pieceId,
    position: { x: 0, y: 0 },
    rotation: 0,
    flipped: false,
    zIndex: 1,
    groupId,
    lastValidPosition: { x: 0, y: 0 },
  };
}

describe("detach gesture", () => {
  it("records a short first tap", () => {
    expect(completedFirstTap()).toEqual({
      kind: "firstTapCompleted",
      pieceId: "blue-bar",
      completedAt: 100,
    });
  });

  it("recognizes a held second tap on the same piece and keeps the pointer active", () => {
    const secondDown = beginDetachGesture(completedFirstTap(), pointer("blue-bar", 300));
    expect(secondDown.kind).toBe("holdPending");
    const detached = advanceDetachGesture(
      secondDown,
      300 + gestureConfig.detach.secondHoldMs,
    );
    expect(detached).toMatchObject({
      kind: "detachedDragging",
      pieceId: "blue-bar",
      pointerId: 1,
    });
  });

  it("does not start the hold after the double-tap window", () => {
    const secondDown = beginDetachGesture(
      completedFirstTap(),
      pointer("blue-bar", 101 + gestureConfig.detach.doubleTapMaxDelayMs),
    );
    expect(secondDown.kind).toBe("firstPointerDown");
  });

  it("does not start the hold on a different piece", () => {
    const secondDown = beginDetachGesture(completedFirstTap(), pointer("green-wing", 200));
    expect(secondDown).toMatchObject({ kind: "firstPointerDown", pieceId: "green-wing" });
  });

  it("cancels a pending hold after excessive movement", () => {
    const secondDown = beginDetachGesture(completedFirstTap(), pointer("blue-bar", 200));
    expect(moveDetachGesture(secondDown, 1, { x: 21, y: 10 }).kind).toBe("cancelled");
  });

  it("cancels safely on pointercancel", () => {
    const secondDown = beginDetachGesture(completedFirstTap(), pointer("blue-bar", 200));
    expect(cancelDetachGesture(secondDown, 1)).toEqual({ kind: "cancelled", pointerId: 1 });
  });

  it("keeps the second pointer active so dragging can continue immediately", () => {
    const secondDown = beginDetachGesture(completedFirstTap(), pointer("blue-bar", 200, 7));
    const detached = advanceDetachGesture(
      secondDown,
      200 + gestureConfig.detach.secondHoldMs,
    );
    expect(moveDetachGesture(detached, 7, { x: 70, y: 40 })).toEqual(detached);
  });

  it("does not let a different pointer cancel an active hold", () => {
    const secondDown = beginDetachGesture(completedFirstTap(), pointer("blue-bar", 200, 7));
    expect(cancelDetachGesture(secondDown, 9)).toEqual(secondDown);
  });
});

describe("piece detachment and snap lock", () => {
  it("separates a piece from a two-piece group", () => {
    const detached = detachPiece(
      [state("blue-bar", "joined"), state("green-wing", "joined")],
      "blue-bar",
      "blue-alone",
    );
    expect(pieceGroupIds(detached, "blue-bar")).toEqual(new Set(["blue-bar"]));
    expect(pieceGroupIds(detached, "green-wing")).toEqual(new Set(["green-wing"]));
  });

  it("keeps the remaining members joined after removing a middle piece", () => {
    const detached = detachPiece(
      [
        state("blue-bar", "joined"),
        state("green-wing", "joined"),
        state("yellow-cap", "joined"),
      ],
      "green-wing",
      "green-alone",
    );
    expect(pieceGroupIds(detached, "blue-bar")).toEqual(new Set(["blue-bar", "yellow-cap"]));
    expect(pieceGroupIds(detached, "green-wing")).toEqual(new Set(["green-wing"]));
  });

  it("blocks immediate snapping and enables it after the deadline", () => {
    const locks = withSnapLock({}, "blue-bar", 700);
    expect(isSnapLocked(locks, "blue-bar", 699)).toBe(true);
    expect(isSnapLocked(locks, "blue-bar", 700)).toBe(false);
  });

  it("does not modify unrelated groups while detaching", () => {
    const detached = detachPiece(
      [
        state("blue-bar", "joined-a"),
        state("green-wing", "joined-a"),
        state("yellow-cap", "joined-b"),
        state("pink-keystone", "joined-b"),
      ],
      "blue-bar",
      "blue-alone",
    );
    expect(pieceGroupIds(detached, "yellow-cap")).toEqual(
      new Set(["yellow-cap", "pink-keystone"]),
    );
  });
});
