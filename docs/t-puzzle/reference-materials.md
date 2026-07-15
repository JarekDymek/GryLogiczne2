# T-Puzzle Reference Materials

This file tracks the raster source materials available for reconstructing
T-Puzzle levels. These images are references only. Runtime pieces, previews,
silhouettes, collision checks, and validation should be generated from vector
data.

## Core Geometry Source

- `T-puzle.jpg` - geometry reference for Gardner's T, Nob's T, and Asymmetric T.
  The current prototype uses only Gardner's T.

## Numbered Color Solutions

- `Figury 1.png` - numbered color solutions 1-24.
- `T-puzle-figury 3.jpg` - numbered color solutions 49-68.
- `T-puzle-figury 2.jpg` - numbered color solutions 81-100.
- `Figury - kolorowe.jpeg` - additional full color screenshot containing
  numbered figures 1-104. Use it as a reference to confirm or fill numbered
  solution ranges only after the vector editor/import workflow is ready.

## Silhouette References

- `T-puzle-figury zaciemnione.jpeg` - named silhouette reference.
- `Figury - czarne.jpeg` - additional full black silhouette screenshot
  containing numbered figures 1-104. Use it to verify target silhouettes, not
  to derive piece geometry.

## Named Figure Galleries

- `T-puzle-figury.jpg` - named gallery with visible four-piece layouts.

## Newly Confirmed Ranges

The original material set did not directly confirm numbered color solutions for:

- 25-48
- 69-80
- 101-104

The new full screenshots include these ranges. They are now part of the figure
catalog, but they should still be reconstructed through the level editor and
verified mathematically before being accepted as playable levels.
