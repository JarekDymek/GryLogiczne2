# T-Puzzle Level Progression

The two full screenshots confirm a numbered catalog of 104 figures:

- `Figury - kolorowe.jpeg` - color solution reference for figures 1-104.
- `Figury - czarne.jpeg` - black silhouette reference for figures 1-104.

The game must not use the color solutions as the player-facing target. Player
targets should be black silhouettes without internal piece lines and rendered at
a different scale than the board.

## Difficulty Stages

| Stage | Figures | Unlock rule |
| --- | ---: | ---: |
| Start | 1-12 | available from the beginning |
| Latwe | 13-24 | 8 completed figures |
| Srednie | 25-48 | 18 completed figures |
| Trudne | 49-68 | 36 completed figures |
| Eksperckie | 69-80 | 52 completed figures |
| Mistrzowskie | 81-104 | 68 completed figures |

These thresholds are initial gameplay data and can be tuned after classroom
testing.

## Playable Target Status

The catalog exists for all 104 figures in `src/games/t-puzzle/catalog.ts`.
Each figure has a generated black target image and a 64x64 normalized
silhouette mask. The current validation compares the player's arranged
silhouette with that target mask.

Figure 1 additionally keeps an exact transform solution because it is the base
T figure used to verify the four piece shapes.
