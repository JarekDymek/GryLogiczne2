export interface ReferenceSolution {
  figureNumber: number;
  tileCount: 4;
  source: "Figury - kolorowe.jpeg";
}

// The supplied colour sheet is the canonical construction reference: every
// numbered silhouette is assembled from the four actual T-puzzle pieces.
export const referenceSolutions: ReferenceSolution[] = Array.from(
  { length: 104 },
  (_, index) => ({
    figureNumber: index + 1,
    tileCount: 4,
    source: "Figury - kolorowe.jpeg",
  }),
);

export function hasReferenceSolution(figureNumber: number): boolean {
  return referenceSolutions.some((solution) => solution.figureNumber === figureNumber);
}
