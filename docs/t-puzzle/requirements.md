# T-Puzzle Requirements

## Implemented Scope

Current prototype covers phases 0-4:

- modular application shell for future logic games;
- first game registry entry: `t-puzzle`;
- vector-rendered T-Puzzle pieces;
- level 1 preview rendered from data, not from a raster screenshot;
- pointer-based drag with pointer capture;
- selected piece z-order lift;
- quarter-turn rotation left and right;
- keyboard rotation shortcuts: `Q` and `E`;
- physical flip modelled as reflection across each piece axis;
- overlap rejection after drag;
- vertex-based snap;
- group movement after snap;
- validation of figure 1 while ignoring global board translation.

## Reference Assets

All raster files in the project are reference materials only. They are not used
as game pieces, collision masks, pixel templates, or validation targets.

The two newly added screenshots are tracked in
`docs/t-puzzle/reference-materials.md`:

- `Figury - kolorowe.jpeg`
- `Figury - czarne.jpeg`

## Current Limitation

The source image `T-puzle.jpg` shows Gardner's T proportions, but the current
implementation is a playable vector prototype and still needs a final audited
algebraic reconstruction before mass level import.
