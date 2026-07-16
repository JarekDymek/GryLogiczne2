import { describe, expect, it } from "vitest";
import { createInitialPieceStates, piecesById } from "../games/t-puzzle/pieces";
import { transformedVertices } from "../games/t-puzzle/geometry";
import { responsiveBoardViewBox } from "./boardScale";

describe("responsive board scaling", () => {
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [412, 915],
    [800, 1280],
    [1280, 720],
  ]) {
    it(`fits every starting tile inside ${width}x${height}`, () => {
      const states = createInitialPieceStates();
      const viewBox = responsiveBoardViewBox(states, piecesById, width, height);

      for (const state of states) {
        for (const point of transformedVertices(piecesById[state.pieceId], state)) {
          expect(point.x).toBeGreaterThanOrEqual(viewBox.x);
          expect(point.x).toBeLessThanOrEqual(viewBox.x + viewBox.width);
          expect(point.y).toBeGreaterThanOrEqual(viewBox.y);
          expect(point.y).toBeLessThanOrEqual(viewBox.y + viewBox.height);
        }
      }
      expect(viewBox.width / viewBox.height).toBeCloseTo(width / height, 6);
    });
  }
});
