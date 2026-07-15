from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from math import cos, pi, sin, sqrt
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw


MASK_SIZE = 64
FIGURE_COUNT = 36
SOURCE_COLUMNS = 6
SOURCE_ROWS = 6
Point = tuple[float, float]


@dataclass(frozen=True)
class PieceStyle:
    piece_class: str
    source_rgb: tuple[int, int, int]
    fill: str
    vertices: tuple[Point, ...]


SQRT2 = sqrt(2)
GARDNER_STEM_BOTTOM = 6 - 2 * SQRT2

PIECES = (
    PieceStyle(
        "blue",
        (240, 160, 192),
        "#2f80ed",
        ((1, 1), (2, 2), (2, GARDNER_STEM_BOTTOM), (1, GARDNER_STEM_BOTTOM)),
    ),
    PieceStyle(
        "green",
        (192, 176, 224),
        "#22c55e",
        ((0, 0), (SQRT2, 0), (1 + SQRT2, 1), (2, 1), (2, 2)),
    ),
    PieceStyle("red", (248, 248, 160), "#ec4899", ((0, 0), (1, 1), (0, 1))),
    PieceStyle(
        "yellow",
        (192, 224, 128),
        "#facc15",
        ((SQRT2, 0), (3, 0), (3, 1), (1 + SQRT2, 1)),
    ),
)

NAMES = (
    ("The T", "Litera T"),
    ("Fat T", "Grube T"),
    ("Italic T", "Pochylone T"),
    ("Teezer", "Pinceta"),
    ("Propeller", "\u015amig\u0142o"),
    ("Y Pentomino", "Pentomino Y"),
    ("Caldera", "Kaldera"),
    ("Arrow", "Strza\u0142a"),
    ("Ramp", "Rampa"),
    ("Happy Baby", "Weso\u0142e dziecko"),
    ("Bowl", "Miska"),
    ("Stairs", "Schody"),
    ("7", "Si\u00f3demka"),
    ("Y", "Litera Y"),
    ("Z", "Litera Z"),
    ("Lefty Z", "Lewe Z"),
    ("Cane", "Laska"),
    ("Funiculaire", "Kolej linowa"),
    ("Halberd", "Halabarda"),
    ("Harpoon", "Harpun"),
    ("Sword", "Miecz"),
    ("Tomahawk", "Tomahawk"),
    ("Villa", "Willa"),
    ("Factory", "Fabryka"),
    ("Boomerang", "Bumerang"),
    ("Hockey stick", "Kij hokejowy"),
    ("Golf bag", "Torba golfowa"),
    ("Medium Golf bag", "\u015arednia torba golfowa"),
    ("Tall Golf bag", "Wysoka torba golfowa"),
    ("Putter", "Putter"),
    ("Hand plane", "Strug"),
    ("Adjustable Spanner", "Klucz nastawny"),
    ("Hammer", "M\u0142otek"),
    ("Anchor", "Kotwica"),
    ("Paperweight", "Przycisk do papieru"),
    ("Mounted L", "Osadzone L"),
)


def largest_component(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    best: list[tuple[int, int]] = []

    for y in range(height):
        for x in range(width):
            if not mask[y, x] or visited[y, x]:
                continue
            queue = deque([(x, y)])
            visited[y, x] = True
            component: list[tuple[int, int]] = []
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if 0 <= nx < width and 0 <= ny < height and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        queue.append((nx, ny))
            if len(component) > len(best):
                best = component

    result = np.zeros_like(mask, dtype=bool)
    for x, y in best:
        result[y, x] = True
    return result


def polygon_area(points: tuple[Point, ...]) -> float:
    return abs(
        sum(
            points[index][0] * points[(index + 1) % len(points)][1]
            - points[(index + 1) % len(points)][0] * points[index][1]
            for index in range(len(points))
        )
        / 2
    )


def polygon_centroid(points: tuple[Point, ...]) -> Point:
    cross_products = [
        points[index][0] * points[(index + 1) % len(points)][1]
        - points[(index + 1) % len(points)][0] * points[index][1]
        for index in range(len(points))
    ]
    signed_area = sum(cross_products) / 2
    factor = 1 / (6 * signed_area)
    return (
        factor
        * sum(
            (points[index][0] + points[(index + 1) % len(points)][0]) * cross_products[index]
            for index in range(len(points))
        ),
        factor
        * sum(
            (points[index][1] + points[(index + 1) % len(points)][1]) * cross_products[index]
            for index in range(len(points))
        ),
    )


def oriented_polygons(points: tuple[Point, ...]) -> list[tuple[Point, ...]]:
    center_x, center_y = polygon_centroid(points)
    centered = [(x - center_x, y - center_y) for x, y in points]
    variants: list[tuple[Point, ...]] = []
    signatures: set[tuple[Point, ...]] = set()

    for mirrored in (False, True):
        reflected = [(-x if mirrored else x, y) for x, y in centered]
        for step in range(8):
            angle = step * pi / 4
            cosine = cos(angle)
            sine = sin(angle)
            rotated = tuple(
                (x * cosine - y * sine, x * sine + y * cosine) for x, y in reflected
            )
            signature = tuple((round(x, 6), round(y, 6)) for x, y in rotated)
            if signature not in signatures:
                signatures.add(signature)
                variants.append(rotated)
    return variants


def rasterize_polygon(points: list[Point], width: int, height: int) -> np.ndarray:
    image = Image.new("1", (width, height), 0)
    ImageDraw.Draw(image).polygon(points, fill=1)
    return np.asarray(image, dtype=bool)


def dice_score(first: np.ndarray, second: np.ndarray) -> float:
    denominator = int(first.sum()) + int(second.sum())
    if denominator == 0:
        return 0
    return 2 * int(np.logical_and(first, second).sum()) / denominator


def fit_piece_at_scale(component: np.ndarray, piece: PieceStyle, scale: float) -> tuple[float, list[Point]]:
    height, width = component.shape
    source_y, source_x = np.where(component)
    target_center = (float(source_x.mean()), float(source_y.mean()))
    best_score = -1.0
    best_polygon: list[Point] = []

    for oriented in oriented_polygons(piece.vertices):
        scaled = [(x * scale, y * scale) for x, y in oriented]
        for offset_y in (-2, -1, 0, 1, 2):
            for offset_x in (-2, -1, 0, 1, 2):
                polygon = [
                    (x + target_center[0] + offset_x, y + target_center[1] + offset_y)
                    for x, y in scaled
                ]
                score = dice_score(component, rasterize_polygon(polygon, width, height))
                if score > best_score:
                    best_score = score
                    best_polygon = polygon

    return best_score, best_polygon


def fit_exact_polygons(
    components: list[tuple[PieceStyle, np.ndarray]],
) -> list[tuple[PieceStyle, list[Point]]]:
    rough_scales = [
        sqrt(int(component.sum()) / polygon_area(piece.vertices))
        for piece, component in components
    ]
    median_scale = float(np.median(rough_scales))
    best_total_score = -1.0
    best_polygons: list[tuple[PieceStyle, list[Point]]] = []
    best_scale = median_scale

    # All four pieces in a source figure share one physical scale. Searching
    # that scale jointly prevents a small JPEG fragment from changing a piece's
    # proportions while still recovering its rotation, reflection and position.
    for scale_factor in np.linspace(0.92, 1.14, 12):
        scale = median_scale * float(scale_factor)
        fitted: list[tuple[PieceStyle, list[Point]]] = []
        total_score = 0.0
        for piece, component in components:
            score, polygon = fit_piece_at_scale(component, piece, scale)
            total_score += score
            fitted.append((piece, polygon))
        if total_score > best_total_score:
            best_total_score = total_score
            best_polygons = fitted
            best_scale = scale

    if best_total_score / len(components) < 0.65:
        raise ValueError(f"Nie udalo sie wiarygodnie dopasowac geometrii klockow ({best_total_score:.2f}).")

    # The classified color is the interior of a piece; the source drawing has
    # a dark outline around it. Restore that outline width with one common
    # scale correction so neighboring exact polygons meet at their edges.
    outline_correction = (best_scale + 1.3) / best_scale
    corrected: list[tuple[PieceStyle, list[Point]]] = []
    for piece, polygon in best_polygons:
        center_x, center_y = polygon_centroid(tuple(polygon))
        corrected.append(
            (
                piece,
                [
                    (
                        center_x + (x - center_x) * outline_correction,
                        center_y + (y - center_y) * outline_correction,
                    )
                    for x, y in polygon
                ],
            )
        )
    return corrected


def format_number(value: float) -> str:
    rounded = round(value, 2)
    return str(int(rounded)) if rounded.is_integer() else f"{rounded:.2f}".rstrip("0").rstrip(".")


def polygon_points(points: list[Point]) -> str:
    return " ".join(f"{format_number(x)},{format_number(y)}" for x, y in points)


def classify_source(image: Image.Image) -> np.ndarray:
    pixels = np.asarray(image, dtype=np.int32)
    prototypes = np.asarray([piece.source_rgb for piece in PIECES], dtype=np.int32)
    differences = pixels[:, :, None, :] - prototypes[None, None, :, :]
    distances = np.sum(differences * differences, axis=3)
    labels = np.argmin(distances, axis=2)
    spread = pixels.max(axis=2) - pixels.min(axis=2)
    valid = (distances.min(axis=2) <= 6500) & (spread >= 20) & (pixels.max(axis=2) >= 100)
    return np.where(valid, labels, -1)


def build_validation_mask(cell_labels: np.ndarray) -> np.ndarray:
    source_y, source_x = np.where(cell_labels >= 0)
    if len(source_x) == 0:
        raise ValueError("Brak kolorowych pikseli potrzebnych do zbudowania maski walidacyjnej.")

    min_x = int(source_x.min())
    max_x = int(source_x.max())
    min_y = int(source_y.min())
    max_y = int(source_y.max())
    scale = min(50 / max(1, max_x - min_x + 1), 50 / max(1, max_y - min_y + 1))
    offset_x = (MASK_SIZE - (max_x - min_x + 1) * scale) / 2
    offset_y = (MASK_SIZE - (max_y - min_y + 1) * scale) / 2
    mask = np.zeros((MASK_SIZE, MASK_SIZE), dtype=bool)

    for x, y in zip(source_x, source_y, strict=True):
        target_x = round(offset_x + (int(x) - min_x) * scale)
        target_y = round(offset_y + (int(y) - min_y) * scale)
        left = max(0, target_x - 2)
        right = min(MASK_SIZE, target_x + 3)
        top = max(0, target_y - 2)
        bottom = min(MASK_SIZE, target_y + 3)
        mask[top:bottom, left:right] = True

    return largest_component(mask)


def write_svg(
    path: Path,
    polygons: list[tuple[PieceStyle, list[Point]]],
    solid: bool,
) -> None:
    all_points = [point for _, polygon in polygons for point in polygon]
    min_x = min(point[0] for point in all_points) - 2
    min_y = min(point[1] for point in all_points) - 2
    max_x = max(point[0] for point in all_points) + 2
    max_y = max(point[1] for point in all_points) + 2
    view_box = " ".join(format_number(value) for value in (min_x, min_y, max_x - min_x, max_y - min_y))
    if solid:
        elements = [
            "  <defs>",
            '    <mask id="target-union" maskUnits="userSpaceOnUse">',
            f'      <rect x="{format_number(min_x)}" y="{format_number(min_y)}" '
            f'width="{format_number(max_x - min_x)}" height="{format_number(max_y - min_y)}" fill="black" />',
            '      <g fill="white" stroke="white" stroke-width="0.8" stroke-linejoin="round">',
        ]
        for piece, polygon in polygons:
            elements.append(
                f'        <polygon data-piece="{piece.piece_class}" points="{polygon_points(polygon)}" />'
            )
        elements.extend(
            [
                "      </g>",
                "    </mask>",
                "  </defs>",
                f'  <rect x="{format_number(min_x)}" y="{format_number(min_y)}" '
                f'width="{format_number(max_x - min_x)}" height="{format_number(max_y - min_y)}" '
                'fill="#14213d" mask="url(#target-union)" />',
            ]
        )
    else:
        elements = ['  <g stroke="#334155" stroke-width="0.55" stroke-linejoin="round">']
        for piece, polygon in polygons:
            elements.append(
                f'    <polygon data-piece="{piece.piece_class}" points="{polygon_points(polygon)}" '
                f'fill="{piece.fill}" />'
            )
        elements.append("  </g>")
    content = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" preserveAspectRatio="xMidYMid meet">\n'
        + "\n".join(elements)
        + "\n</svg>\n"
    )
    path.write_text(content, encoding="utf-8", newline="\n")


def generate(repository_root: Path) -> None:
    source_path = repository_root / "T-puzle-figury.jpg"
    target_directory = repository_root / "public" / "t-puzzle" / "named"
    solution_directory = repository_root / "public" / "t-puzzle" / "named-solutions"
    typescript_path = repository_root / "src" / "games" / "t-puzzle" / "namedGardnerTargets.ts"

    target_directory.mkdir(parents=True, exist_ok=True)
    solution_directory.mkdir(parents=True, exist_ok=True)
    for directory in (target_directory, solution_directory):
        for stale_path in directory.glob("figure-*.png"):
            stale_path.unlink()

    source = Image.open(source_path).convert("RGB")
    labels = classify_source(source)
    entries: list[str] = []

    for index, (source_name, polish_name) in enumerate(NAMES):
        column = index % SOURCE_COLUMNS
        row = index // SOURCE_COLUMNS
        left = column * source.width // SOURCE_COLUMNS
        right = (column + 1) * source.width // SOURCE_COLUMNS
        top = row * source.height // SOURCE_ROWS
        bottom = (row + 1) * source.height // SOURCE_ROWS
        cell_labels = labels[top:bottom, left:right]
        components: list[tuple[PieceStyle, np.ndarray]] = []

        for piece_index, piece in enumerate(PIECES):
            component = largest_component(cell_labels == piece_index)
            if component.sum() < 8:
                raise ValueError(f"Figura {index + 1} nie zawiera klocka {piece.piece_class}.")
            components.append((piece, component))

        polygons = fit_exact_polygons(components)

        mask = build_validation_mask(cell_labels)

        number = f"{index + 1:03d}"
        write_svg(target_directory / f"figure-{number}.svg", polygons, solid=True)
        write_svg(solution_directory / f"figure-{number}.svg", polygons, solid=False)

        rows = ["".join("1" if value else "0" for value in row_values) for row_values in mask]
        row_source = ",\n".join(f'      "{row_value}"' for row_value in rows)
        entries.append(
            "  {\n"
            f"    figureNumber: {index + 1},\n"
            f"    sourceName: {source_name!r},\n"
            f"    name: {polish_name!r},\n"
            f"    mask: {{ figureNumber: {index + 1}, size: {MASK_SIZE}, rows: [\n"
            f"{row_source}\n"
            "    ] },\n"
            "  }"
        )

    typescript = (
        'import type { TargetMask } from "./targetMasks";\n\n'
        "export interface NamedGardnerTarget {\n"
        "  figureNumber: number;\n"
        "  sourceName: string;\n"
        "  name: string;\n"
        "  mask: TargetMask;\n"
        "}\n\n"
        "export const namedGardnerTargets: NamedGardnerTarget[] = [\n"
        + ",\n".join(entries)
        + "\n];\n\n"
        "export const namedGardnerTargetMasks = Object.fromEntries(\n"
        "  namedGardnerTargets.map((target) => [target.figureNumber, target.mask]),\n"
        ") as Record<number, TargetMask>;\n"
    )
    typescript_path.write_text(typescript.replace("'", '"'), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
    generate(root)
