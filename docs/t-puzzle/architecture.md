# T-Puzzle Architecture

## Application Shell

The project uses React, TypeScript, and Vite. The app shell lives in `src/App.tsx`
and loads games from `src/games/registry.ts`.

## Module Layout

T-Puzzle is isolated under `src/games/t-puzzle`:

- `types.ts` - stable domain types;
- `config.ts` - world-space tolerances and board dimensions;
- `pieces.ts` - immutable piece definitions and initial state;
- `geometry.ts` - UI-independent geometry operations;
- `levels.ts` - data-driven level definitions;
- `snap.ts` - snap and group movement helpers;
- `validation.ts` - solution validation;
- `components/TPuzzleGame.tsx` - React interaction layer.

## State Model

`PieceDefinition` is immutable geometry. `PieceState` stores only runtime
transform data: piece id, position, quarter rotation, flipped state, z-index,
group id, and last valid position.

The UI never mutates source vertices. It computes transformed polygons from the
definition and state.

## World Coordinates

All geometry uses logical world units. SVG `viewBox` handles screen scaling, so
piece proportions stay stable on desktop, tablet, and phone.
