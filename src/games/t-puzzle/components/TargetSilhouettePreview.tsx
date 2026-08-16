import { solutionPreviewGeometry } from "../preview";
import type { TargetDefinition } from "../types";

function pointsAttribute(points: Array<{ x: number; y: number }>): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function TargetSilhouettePreview({ target }: { target: TargetDefinition }) {
  const geometry = solutionPreviewGeometry(target.familyId, target, 0.025);

  return (
    <svg
      className="target-preview"
      viewBox={geometry.viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Jednolita figura: ${target.name}`}
    >
      {geometry.polygons.map((polygon) => (
        <polygon
          key={polygon.pieceId}
          points={pointsAttribute(polygon.points)}
          fill="#14213d"
          stroke="#14213d"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
