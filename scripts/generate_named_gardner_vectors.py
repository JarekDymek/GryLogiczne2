from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from math import hypot
from pathlib import Path
import sys

import numpy as np
from PIL import Image


MASK_SIZE = 64
FIGURE_COUNT = 36
SOURCE_COLUMNS = 6
SOURCE_ROWS = 6


@dataclass(frozen=True)
class PieceStyle:
    piece_class: str
    source_rgb: tuple[int, int, int]
    fill: str


PIECES = (
    PieceStyle("blue", (240, 160, 192), "#2f80ed"),
    PieceStyle("green", (192, 176, 224), "#22c55e"),
    PieceStyle("red", (248, 248, 160), "#ec4899"),
    PieceStyle("yellow", (192, 224, 128), "#facc15"),
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


Point = tuple[float, float]


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


def trace_outer_boundary(mask: np.ndarray) -> list[Point]:
    height, width = mask.shape
    edges: list[tuple[Point, Point]] = []

    for y in range(height):
        for x in range(width):
            if not mask[y, x]:
                continue
            if y == 0 or not mask[y - 1, x]:
                edges.append(((x, y), (x + 1, y)))
            if x == width - 1 or not mask[y, x + 1]:
                edges.append(((x + 1, y), (x + 1, y + 1)))
            if y == height - 1 or not mask[y + 1, x]:
                edges.append(((x + 1, y + 1), (x, y + 1)))
            if x == 0 or not mask[y, x - 1]:
                edges.append(((x, y + 1), (x, y)))

    outgoing: dict[Point, list[Point]] = defaultdict(list)
    for start, end in edges:
        outgoing[start].append(end)

    loops: list[list[Point]] = []
    unused = set(edges)
    while unused:
        start_edge = min(unused)
        start, current = start_edge
        loop = [start]
        unused.remove(start_edge)
        while current != start:
            loop.append(current)
            candidates = [end for end in outgoing[current] if (current, end) in unused]
            if not candidates:
                break
            next_point = candidates[0]
            unused.remove((current, next_point))
            current = next_point
        if current == start:
            loops.append(loop)

    if not loops:
        raise ValueError("Nie znaleziono zamknietego konturu klocka.")
    return max(loops, key=len)


def point_line_distance(point: Point, start: Point, end: Point) -> float:
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    if dx == 0 and dy == 0:
        return hypot(point[0] - start[0], point[1] - start[1])
    numerator = abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0])
    return numerator / hypot(dx, dy)


def rdp(points: list[Point], tolerance: float) -> list[Point]:
    if len(points) <= 2:
        return points
    distance, index = max(
        (point_line_distance(point, points[0], points[-1]), index)
        for index, point in enumerate(points[1:-1], start=1)
    )
    if distance <= tolerance:
        return [points[0], points[-1]]
    return rdp(points[: index + 1], tolerance)[:-1] + rdp(points[index:], tolerance)


def simplify_closed_polygon(points: list[Point], tolerance: float = 2.2) -> list[Point]:
    if len(points) < 4:
        return points

    first_index = min(range(len(points)), key=lambda index: (points[index][1], points[index][0]))
    farthest_index = max(
        range(len(points)),
        key=lambda index: hypot(
            points[index][0] - points[first_index][0],
            points[index][1] - points[first_index][1],
        ),
    )
    if first_index > farthest_index:
        first_index, farthest_index = farthest_index, first_index

    first_path = points[first_index : farthest_index + 1]
    second_path = points[farthest_index:] + points[: first_index + 1]
    simplified = rdp(first_path, tolerance)[:-1] + rdp(second_path, tolerance)[:-1]

    changed = True
    while changed and len(simplified) > 3:
        changed = False
        for index in range(len(simplified)):
            previous = simplified[index - 1]
            current = simplified[index]
            following = simplified[(index + 1) % len(simplified)]
            if point_line_distance(current, previous, following) < 0.45:
                simplified.pop(index)
                changed = True
                break
    return simplified


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


def mask_component_count(mask: np.ndarray) -> int:
    remaining = mask.copy()
    count = 0
    while remaining.any():
        component = largest_component(remaining)
        remaining &= ~component
        count += 1
    return count


def dilate(mask: np.ndarray) -> np.ndarray:
    padded = np.pad(mask, 1)
    result = np.zeros_like(mask)
    for dy in range(3):
        for dx in range(3):
            result |= padded[dy : dy + mask.shape[0], dx : dx + mask.shape[1]]
    return result


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
    silhouette: list[Point],
    solid: bool,
) -> None:
    all_points = silhouette + [point for _, polygon in polygons for point in polygon]
    min_x = min(point[0] for point in all_points) - 3
    min_y = min(point[1] for point in all_points) - 3
    max_x = max(point[0] for point in all_points) + 3
    max_y = max(point[1] for point in all_points) + 3
    view_box = " ".join(format_number(value) for value in (min_x, min_y, max_x - min_x, max_y - min_y))
    if solid:
        elements = [f'  <polygon points="{polygon_points(silhouette)}" fill="#14213d" />']
    else:
        elements = [
            "  <defs>",
            f'    <polygon id="solution-silhouette" points="{polygon_points(silhouette)}" />',
            '    <clipPath id="solution-clip"><use href="#solution-silhouette" /></clipPath>',
            "  </defs>",
            '  <use href="#solution-silhouette" fill="#334155" />',
            '  <g clip-path="url(#solution-clip)">',
        ]
        for piece, polygon in polygons:
            elements.append(
                f'    <polygon points="{polygon_points(polygon)}" fill="{piece.fill}" stroke="{piece.fill}" '
                'stroke-width="4.6" stroke-linejoin="round" />'
            )
        elements.extend([
            "  </g>",
            '  <use href="#solution-silhouette" fill="none" stroke="#334155" stroke-width="0.6" stroke-linejoin="round" />',
        ])
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
        polygons: list[tuple[PieceStyle, list[Point]]] = []
        piece_components: list[np.ndarray] = []

        for piece_index, piece in enumerate(PIECES):
            component = largest_component(cell_labels == piece_index)
            if component.sum() < 8:
                raise ValueError(f"Figura {index + 1} nie zawiera klocka {piece.piece_class}.")
            contour = trace_outer_boundary(component)
            polygon = simplify_closed_polygon(contour)
            if len(polygon) < 3 or len(polygon) > 10:
                raise ValueError(
                    f"Figura {index + 1}, klocek {piece.piece_class}: podejrzany kontur ({len(polygon)} wierzcholkow)."
                )
            polygons.append((piece, polygon))
            piece_components.append(component)

        silhouette_mask = np.logical_or.reduce(piece_components)
        # Source outlines are two to three JPEG pixels wide. Expanding the union
        # closes those internal seams before tracing one external silhouette.
        silhouette_mask = dilate(dilate(silhouette_mask))
        for _ in range(4):
            if mask_component_count(silhouette_mask) == 1:
                break
            silhouette_mask = dilate(silhouette_mask)
        if mask_component_count(silhouette_mask) != 1:
            raise ValueError(f"Figura {index + 1} nie tworzy jednej spojnej sylwetki zrodlowej.")
        silhouette = simplify_closed_polygon(trace_outer_boundary(silhouette_mask), tolerance=2.0)

        mask = build_validation_mask(cell_labels)

        number = f"{index + 1:03d}"
        write_svg(target_directory / f"figure-{number}.svg", polygons, silhouette, solid=True)
        write_svg(solution_directory / f"figure-{number}.svg", polygons, silhouette, solid=False)

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
