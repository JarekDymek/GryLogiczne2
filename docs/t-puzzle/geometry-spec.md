# Gardner's T Geometry Spec

## Status

The playable model uses the classic T-puzzle family confirmed by public
references and the supplied color screenshot:

- one right isosceles triangle,
- two right trapezoids,
- one irregular pentagon.

The target shown to the player is a black silhouette with no internal color
lines. The working pieces are also neutral black.

## Base Unit

The prototype uses logical world unit `a = 1`. The solved figure 1 silhouette
is a T with top bar `0..3 x 0..1` and stem `1..2 x 1..4`.

## Piece Summary

### `blue-bar`

- Shape: right trapezoid forming the stem.
- Vertices, clockwise:
  - `(2, 1)`
  - `(2, 4)`
  - `(1, 4)`
  - `(1, 2)`
- Area: `2.5`

### `green-wing`

- Shape: irregular pentagon.
- Vertices, clockwise:
  - `(sqrt(2), 0)`
  - `(3, 0)`
  - `(2, 1)`
  - `(1, 2)`
  - `(1, 1)`
- Area: `(3.586...) / 2`

### `pink-keystone`

- Shape: left right trapezoid.
- Vertices, clockwise:
  - `(0, 0)`
  - `(sqrt(2), 0)`
  - `(1, 1)`
  - `(0, 1)`
- Area: `(1 + sqrt(2)) / 2`

### `yellow-cap`

- Shape: right isosceles right triangle.
- Vertices, clockwise:
  - `(3, 0)`
  - `(3, 1)`
  - `(2, 1)`
- Area: `0.5`

## Total Area

The solved figure area is `6`. The four polygons tile the T without overlap;
edge contact is valid.

## Extracted Targets

The 104 black target previews are generated from `Figury - czarne.jpeg`.
The largest black component from each reference cell is saved under
`public/t-puzzle/targets/figure-001.png` through `figure-104.png`.

Runtime validation compares the player's normalized black silhouette against
the generated target mask. Figure 1 also keeps the exact transform solution as
an additional regression check.
