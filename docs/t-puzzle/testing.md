# T-Puzzle Testing

## Implemented Unit Tests

`src/games/t-puzzle/geometry.test.ts` checks:

- area stability after quarter rotations;
- area stability after flip;
- edge contact in the solved figure is not overlap;
- real overlap is detected;
- solved figure remains valid after global translation;
- wrong transform is rejected;
- nearby vertex snap is found and does not create overlap.

## Manual Interaction Checks

The prototype should be checked in a browser for:

- pointer drag;
- selected z-order lift;
- pointer capture during fast movement;
- rotate left and right;
- keyboard `Q` and `E`;
- flip button and double click;
- reset;
- solution validation;
- responsive layout at 390 x 844, 768 x 1024, and 1366 x 768.

## Latest Verification

- TypeScript: passed with `tsc -b`.
- Unit tests: passed, 7/7 tests.
- Production build: passed with Vite.
