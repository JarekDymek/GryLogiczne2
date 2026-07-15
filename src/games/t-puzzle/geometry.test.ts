import { describe, expect, it } from "vitest";
import { hasAnyOverlap, polygonArea, transformedVertices } from "./geometry";
import { mobileBoardViewBox } from "./config";
import { getVerifiedPuzzleSolutions } from "./generatedPuzzles";
import { getTPuzzleLevels, tPuzzleLevels } from "./levels";
import { namedGardnerTargets } from "./namedGardnerTargets";
import { createInitialPieceStates, pieceDefinitions, pieceDefinitionsByFamily, piecesByFamily, piecesById, puzzleFamilies, T_PUZZLE_HEIGHT } from "./pieces";
import { applyDeltaToStates, findSnap } from "./snap";
import { isTargetSolved } from "./validation";
import type { PieceRotation, PieceState, PieceTransform } from "./types";

function solutionStates(): PieceState[] {
  return createInitialPieceStates().map((state) => ({
    ...state,
    position: { x: 0, y: 0 },
    rotation: 0,
    flipped: false,
    groupId: "solution",
    lastValidPosition: { x: 0, y: 0 },
  }));
}

function statesFromSolution(solution: PieceTransform[]): PieceState[] {
  return solution.map((transform, index) => ({
    pieceId: transform.pieceId,
    position: { x: transform.x, y: transform.y },
    rotation: transform.rotation,
    flipped: transform.flipped,
    zIndex: index + 1,
    groupId: "verified-solution",
    lastValidPosition: { x: transform.x, y: transform.y },
  }));
}

function mirroredFigureOneStates(): PieceState[] {
  const states: PieceState[] = [
    {
      pieceId: "blue-bar",
      position: { x: 0, y: 0 },
      rotation: 0,
      flipped: true,
      zIndex: 1,
      groupId: "mirrored-solution",
      lastValidPosition: { x: 0, y: 0 },
    },
    {
      pieceId: "green-wing",
      position: { x: 1, y: 0 },
      rotation: 0,
      flipped: true,
      zIndex: 2,
      groupId: "mirrored-solution",
      lastValidPosition: { x: 1, y: 0 },
    },
    {
      pieceId: "pink-keystone",
      position: { x: 2.3333333333333335, y: 0 },
      rotation: 270,
      flipped: false,
      zIndex: 3,
      groupId: "mirrored-solution",
      lastValidPosition: { x: 2.3333333333333335, y: 0 },
    },
    {
      pieceId: "yellow-cap",
      position: { x: -1.5, y: 0 },
      rotation: 0,
      flipped: true,
      zIndex: 4,
      groupId: "mirrored-solution",
      lastValidPosition: { x: -1.5, y: 0 },
    },
  ];

  return states;
}

describe("T-Puzzle geometry", () => {
  it("keeps polygon area after eight 45-degree rotations", () => {
    for (const piece of pieceDefinitions) {
      const base: PieceState = {
        pieceId: piece.id,
        position: { x: 0, y: 0 },
        rotation: 0,
        flipped: false,
        zIndex: 1,
        groupId: "test",
        lastValidPosition: { x: 0, y: 0 },
      };
      const area = polygonArea(transformedVertices(piece, base));
      const rotated = [45, 90, 135, 180, 225, 270, 315, 0].reduce(
        (state, rotation) => ({ ...state, rotation: rotation as PieceRotation }),
        base,
      );
      expect(polygonArea(transformedVertices(piece, rotated))).toBeCloseTo(area, 8);
    }
  });

  it("keeps polygon area after a flip", () => {
    for (const piece of pieceDefinitions) {
      const normal = transformedVertices(piece, {
        pieceId: piece.id,
        position: { x: 0, y: 0 },
        rotation: 0,
        flipped: false,
        zIndex: 1,
        groupId: "test",
        lastValidPosition: { x: 0, y: 0 },
      });
      const flipped = transformedVertices(piece, {
        pieceId: piece.id,
        position: { x: 0, y: 0 },
        rotation: 0,
        flipped: true,
        zIndex: 1,
        groupId: "test",
        lastValidPosition: { x: 0, y: 0 },
      });
      expect(polygonArea(flipped)).toBeCloseTo(polygonArea(normal), 8);
    }
  });

  it("does not treat edge contact in the solved T as overlap", () => {
    expect(hasAnyOverlap(solutionStates(), piecesById)).toBe(false);
  });

  it("keeps every starting piece fully visible on the mobile board", () => {
    const states = createInitialPieceStates();

    for (const state of states) {
      const vertices = transformedVertices(piecesById[state.pieceId], state);
      const xs = vertices.map((point) => point.x);
      const ys = vertices.map((point) => point.y);

      expect(Math.min(...xs)).toBeGreaterThanOrEqual(mobileBoardViewBox.x);
      expect(Math.max(...xs)).toBeLessThanOrEqual(mobileBoardViewBox.x + mobileBoardViewBox.width);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(mobileBoardViewBox.y);
      expect(Math.max(...ys)).toBeLessThanOrEqual(mobileBoardViewBox.y + mobileBoardViewBox.height);
    }
    expect(hasAnyOverlap(states, piecesById)).toBe(false);
  });

  it("detects real overlap", () => {
    const states = solutionStates().map((state) =>
      state.pieceId === "blue-bar" ? { ...state, position: { x: -1, y: -1 } } : state,
    );
    expect(hasAnyOverlap(states, piecesById)).toBe(true);
  });

  it("keeps the mathematical T area stable", () => {
    const totalArea = pieceDefinitions.reduce(
      (sum, piece) => sum + polygonArea(piece.vertices),
      0,
    );
    expect(totalArea).toBeCloseTo(8 - 2 * Math.SQRT2, 8);
  });

  it("uses the four-piece T-puzzle family from the reference image", () => {
    const vertexCounts = Object.fromEntries(
      pieceDefinitions.map((piece) => [piece.id, piece.vertices.length]),
    );

    expect(vertexCounts).toEqual({
      "blue-bar": 4,
      "green-wing": 5,
      "pink-keystone": 3,
      "yellow-cap": 4,
    });
  });

  it("forms the exact sqrt2-constructed T outline", () => {
    const vertices = solutionStates().flatMap((state) =>
      transformedVertices(piecesById[state.pieceId], state),
    );
    const xs = vertices.map((point) => point.x);
    const ys = vertices.map((point) => point.y);

    expect(Math.min(...xs)).toBeCloseTo(0, 8);
    expect(Math.max(...xs)).toBeCloseTo(3, 8);
    expect(Math.min(...ys)).toBeCloseTo(0, 8);
    expect(Math.max(...ys)).toBeCloseTo(T_PUZZLE_HEIGHT, 8);
    expect(hasAnyOverlap(solutionStates(), piecesById)).toBe(false);
  });

  it("keeps the approved tile side lengths from the reference diagram", () => {
    const leftTriangle = piecesById["pink-keystone"].vertices;
    const centralPentagon = piecesById["green-wing"].vertices;
    const rightTrapezoid = piecesById["yellow-cap"].vertices;
    const stem = piecesById["blue-bar"].vertices;

    function edgeLengths(vertices: typeof stem): number[] {
      return vertices.map((point, index) => {
        const next = vertices[(index + 1) % vertices.length];
        return Math.hypot(next.x - point.x, next.y - point.y);
      });
    }

    const leftEdges = edgeLengths(leftTriangle);
    expect(leftEdges[0]).toBeCloseTo(Math.SQRT2, 8);
    expect(leftEdges[1]).toBeCloseTo(1, 8);
    expect(leftEdges[2]).toBeCloseTo(1, 8);

    const centralEdges = edgeLengths(centralPentagon);
    expect(centralEdges[0]).toBeCloseTo(Math.SQRT2, 8);
    expect(centralEdges[1]).toBeCloseTo(Math.SQRT2, 8);
    expect(centralEdges[2]).toBeCloseTo(Math.SQRT2 - 1, 8);
    expect(centralEdges[3]).toBeCloseTo(1, 8);
    expect(centralEdges[4]).toBeCloseTo(2 * Math.SQRT2, 8);

    const rightEdges = edgeLengths(rightTrapezoid);
    expect(rightEdges[0]).toBeCloseTo(3 - Math.SQRT2, 8);
    expect(rightEdges[1]).toBeCloseTo(1, 8);
    expect(rightEdges[2]).toBeCloseTo(2 - Math.SQRT2, 8);
    expect(rightEdges[3]).toBeCloseTo(Math.SQRT2, 8);

    const stemEdges = edgeLengths(stem);
    expect(stemEdges[0]).toBeCloseTo(Math.SQRT2, 8);
    expect(stemEdges[1]).toBeCloseTo(4 - 2 * Math.SQRT2, 8);
    expect(stemEdges[2]).toBeCloseTo(1, 8);
    expect(stemEdges[3]).toBeCloseTo(5 - 2 * Math.SQRT2, 8);
  });

  it("defines the exact dimensions of Gardner, Nob and Asymmetric T", () => {
    expect(puzzleFamilies.map((family) => family.id)).toEqual(["gardner", "nob", "asymmetric"]);

    const expectedBounds = {
      gardner: { width: 3, height: 6 - 2 * Math.SQRT2, topCut: Math.SQRT2 },
      nob: { width: 3, height: 4, topCut: 1.5 },
      asymmetric: { width: 2 * Math.SQRT2, height: 1 + 2 * Math.SQRT2, topCut: Math.SQRT2 },
    };

    for (const family of puzzleFamilies) {
      const pieces = piecesByFamily[family.id];
      const states = solutionStates();
      const vertices = states.flatMap((state) => transformedVertices(pieces[state.pieceId], state));
      const xs = vertices.map((point) => point.x);
      const ys = vertices.map((point) => point.y);

      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(expectedBounds[family.id].width, 8);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(expectedBounds[family.id].height, 8);
      expect(pieces["green-wing"].vertices[1].x).toBeCloseTo(expectedBounds[family.id].topCut, 8);
      expect(hasAnyOverlap(states, pieces)).toBe(false);
      expect(pieceDefinitionsByFamily[family.id]).toHaveLength(4);
    }
  });

  it("puts three selectable variants in every level", () => {
    for (const level of tPuzzleLevels) {
      expect(level.targets).toHaveLength(3);
    }
  });

  it("builds a multi-stage MOW progression", () => {
    expect(tPuzzleLevels).toHaveLength(34);
    expect(tPuzzleLevels[0].targets.map((target) => target.displayNumber)).toEqual([1, 2, 3]);
    expect(tPuzzleLevels.at(-1)?.targets.map((target) => target.displayNumber)).toEqual([100, 101, 102]);
  });

  it("keeps a verified four-piece construction for every playable target", () => {
    for (const familyId of ["gardner", "nob", "asymmetric"] as const) {
      const levels = getTPuzzleLevels(familyId);
      const allTargets = levels.flatMap((level) => level.targets);
      const familyPieces = piecesByFamily[familyId];

      expect(allTargets).toHaveLength(102);
      for (const target of allTargets) {
        expect(target.familyId).toBe(familyId);
        if (familyId === "gardner" && target.displayNumber <= namedGardnerTargets.length) {
          expect(target.maskFigureNumber).toBe(target.displayNumber);
          expect(target.solutions).toHaveLength(0);
          expect(target.name).toBe(namedGardnerTargets[target.displayNumber - 1].name);
          continue;
        }

        expect(target.maskFigureNumber).toBeUndefined();
        expect(target.solutions).toHaveLength(1);
        expect(target.solutions[0].map((piece) => piece.pieceId).sort()).toEqual([
          "blue-bar",
          "green-wing",
          "pink-keystone",
          "yellow-cap",
        ]);

        const states = statesFromSolution(target.solutions[0]);
        expect(hasAnyOverlap(states, familyPieces)).toBe(false);
        expect(isTargetSolved(target, levels[0].validation, states)).toBe(true);
      }
    }
  }, 15000);

  it("varies the blue piece orientation across generated challenges", () => {
    for (const family of puzzleFamilies) {
      const blueRotations = new Set(
        getVerifiedPuzzleSolutions(family.id).map(
          (solution) => solution.find((piece) => piece.pieceId === "blue-bar")?.rotation,
        ),
      );
      expect(blueRotations.size).toBeGreaterThanOrEqual(6);
    }
  }, 15000);

  it("accepts the canonical T silhouette for figure 1", () => {
    expect(isTargetSolved(tPuzzleLevels[0].targets[0], tPuzzleLevels[0].validation, solutionStates())).toBe(true);
  });

  it("accepts the mirrored T silhouette for figure 1", () => {
    const states = mirroredFigureOneStates();
    expect(hasAnyOverlap(states, piecesById)).toBe(false);
    expect(isTargetSolved(tPuzzleLevels[0].targets[0], tPuzzleLevels[0].validation, states)).toBe(true);
  });

  it("rejects a visually plausible but wrong transform", () => {
    const wrong = solutionStates().map((state) =>
      state.pieceId === "yellow-cap" ? { ...state, rotation: 90 as PieceRotation } : state,
    );
    expect(isTargetSolved(tPuzzleLevels[0].targets[0], tPuzzleLevels[0].validation, wrong)).toBe(false);
  });

  it("does not accept a near-miss silhouette with a visible gap", () => {
    const wrong = solutionStates().map((state) =>
      state.pieceId === "yellow-cap"
        ? { ...state, position: { x: 0.24, y: 0 } }
        : state,
    );

    expect(hasAnyOverlap(wrong, piecesById)).toBe(false);
    expect(isTargetSolved(tPuzzleLevels[0].targets[0], tPuzzleLevels[0].validation, wrong)).toBe(false);
  });

  it("finds a nearby vertex snap", () => {
    const states = solutionStates().map((state) =>
      state.pieceId === "blue-bar" ? { ...state, position: { x: -0.05, y: -0.05 } } : state,
    );
    expect(hasAnyOverlap(states, piecesById, new Set(["blue-bar"]))).toBe(true);
    const snap = findSnap(states, piecesById, new Set(["blue-bar"]));
    expect(snap).not.toBeNull();
    const snapped = applyDeltaToStates(states, new Set(["blue-bar"]), snap!.delta);
    expect(hasAnyOverlap(snapped, piecesById, new Set(["blue-bar"]))).toBe(false);
    const blueState = snapped.find((state) => state.pieceId === "blue-bar")!;
    const blueVertices = transformedVertices(piecesById[blueState.pieceId], blueState);
    const passiveVertices = snapped
      .filter((state) => state.pieceId !== "blue-bar")
      .flatMap((state) => transformedVertices(piecesById[state.pieceId], state));
    const closestVertex = Math.min(
      ...blueVertices.flatMap((blueVertex) =>
        passiveVertices.map((passiveVertex) =>
          Math.hypot(blueVertex.x - passiveVertex.x, blueVertex.y - passiveVertex.y),
        ),
      ),
    );
    expect(closestVertex).toBeLessThan(0.00001);
  });
});
