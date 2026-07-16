import { transformedVertices } from "../games/t-puzzle/geometry";
import type {
  PieceDefinition,
  PieceId,
  PieceState,
  Point,
} from "../games/t-puzzle/types";

export interface ResponsiveViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function bounds(points: Point[]) {
  return points.reduce(
    (result, point) => ({
      minX: Math.min(result.minX, point.x),
      minY: Math.min(result.minY, point.y),
      maxX: Math.max(result.maxX, point.x),
      maxY: Math.max(result.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

export function responsiveBoardViewBox(
  states: PieceState[],
  pieces: Record<PieceId, PieceDefinition>,
  viewportWidth: number,
  viewportHeight: number,
  padding = 0.38,
): ResponsiveViewBox {
  const points = states.flatMap((state) => transformedVertices(pieces[state.pieceId], state));
  const content = bounds(points);
  const contentWidth = Math.max(1, content.maxX - content.minX + padding * 2);
  const contentHeight = Math.max(1, content.maxY - content.minY + padding * 2);
  const safeViewportWidth = Math.max(1, viewportWidth);
  const safeViewportHeight = Math.max(1, viewportHeight);
  const viewportRatio = safeViewportWidth / safeViewportHeight;
  const contentRatio = contentWidth / contentHeight;

  let width = contentWidth;
  let height = contentHeight;
  if (contentRatio < viewportRatio) {
    width = height * viewportRatio;
  } else {
    height = width / viewportRatio;
  }

  const centerX = (content.minX + content.maxX) / 2;
  const centerY = (content.minY + content.maxY) / 2;
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}
