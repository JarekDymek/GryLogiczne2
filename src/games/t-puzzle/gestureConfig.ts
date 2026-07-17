export const gestureConfig = {
  detach: {
    doubleTapMaxDelayMs: 340,
    firstTapMaxDurationMs: 260,
    secondHoldMs: 360,
    snapLockMs: 600,
    feedbackMs: 280,
    vibrationMs: 30,
  },
} as const;

export function detachMovementTolerance(devicePixelRatio = 1): number {
  if (devicePixelRatio >= 2) {
    return 12;
  }
  if (devicePixelRatio >= 1.25) {
    return 10;
  }
  return 8;
}
