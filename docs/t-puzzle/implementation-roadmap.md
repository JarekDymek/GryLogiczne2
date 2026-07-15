# T-Puzzle Implementation Roadmap

## Stage 1: Correct Figure 1 Geometry

- Lock the four color-coded vector pieces against the figure 1 reference.
- Keep the current manually reconstructed coordinates in version control.
- Add a diagnostic SVG view with vertex labels, centroids, axes, and edge ids.
- Compare the diagnostic view with `Figury 1.png` and `T-puzle.jpg`.

## Stage 2: Algebraic Gardner's T Audit

- Re-read the Gardner's T source diagram and replace provisional decimals with
  symbolic relations where possible.
- Document exact edge lengths, shared edges, and piece areas.
- Add tests that assert total area, shared-edge lengths, and expected contacts.

## Stage 3: Interaction Hardening

- Improve snap from vertex-only to edge-alignment plus vertex snap.
- Add visible snap feedback while dragging.
- Add explicit group detach controls.
- Add mobile double-tap flip tests.

## Stage 4: Level Editor

- Build `/games/t-puzzle/editor` for internal use.
- Allow arranging pieces, saving canonical transforms, exporting
  `LevelDefinition`, and generating silhouettes.
- Use the editor to reconstruct levels 2-5 before importing larger batches.

## Stage 5: Level Import Batches

- Keep the player-facing target as a black silhouette with no internal lines.
- Import and verify levels 2-5.
- Then import 6-24.
- Then import ranges confirmed by the new full screenshots: 25-48, 49-68,
  69-80, 81-100, and 101-104.
- Every batch must pass geometry validation before becoming playable.

## Stage 6: Classroom Game Flow

- Add level selection, difficulty grouping, local progress, timer modes, and
  completion states.
- Keep data local and versioned under `mow.logicGames.v1`.

## Stage 7: PWA Polish

- Add final MOW logo when the confirmed asset is provided.
- Add offline level data cache versioning.
- Add install/update messaging for tablets and phones.
