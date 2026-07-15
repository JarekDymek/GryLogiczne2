from __future__ import annotations

from collections import deque
from dataclasses import dataclass
import json
from math import atan2, cos, degrees, pi, sin
from pathlib import Path
import sys

from PIL import Image, ImageDraw


MASK_SIZE = 64
FIGURE_COUNT = 36
MASK_PADDING = 3
Point = tuple[float, float]


@dataclass(frozen=True)
class PieceStyle:
    piece_class: str
    fill: str
    vertices: int


@dataclass(frozen=True)
class ValidationResult:
    figure_number: int
    common_scale_error: float
    overlap_ratio: float
    connected: bool


PIECES = (
    PieceStyle("blue", "#2f80ed", 4),
    PieceStyle("green", "#22c55e", 5),
    PieceStyle("red", "#ec4899", 3),
    PieceStyle("yellow", "#facc15", 4),
)
PIECE_BY_CLASS = {piece.piece_class: piece for piece in PIECES}

NAMES = (
    ("The T", "Litera T"),
    ("Fat T", "Grube T"),
    ("Italic T", "Pochylone T"),
    ("Teezer", "Pinceta"),
    ("Propeller", "Śmigło"),
    ("Y Pentomino", "Pentomino Y"),
    ("Caldera", "Kaldera"),
    ("Arrow", "Strzała"),
    ("Ramp", "Rampa"),
    ("Happy Baby", "Wesołe dziecko"),
    ("Bowl", "Miska"),
    ("Stairs", "Schody"),
    ("7", "Siódemka"),
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
    ("Medium Golf bag", "Średnia torba golfowa"),
    ("Tall Golf bag", "Wysoka torba golfowa"),
    ("Putter", "Putter"),
    ("Hand plane", "Strug"),
    ("Adjustable Spanner", "Klucz nastawny"),
    ("Hammer", "Młotek"),
    ("Anchor", "Kotwica"),
    ("Paperweight", "Przycisk do papieru"),
    ("Mounted L", "Osadzone L"),
)


def polygon_area(points: list[Point]) -> float:
    return abs(
        sum(
            points[index][0] * points[(index + 1) % len(points)][1]
            - points[(index + 1) % len(points)][0] * points[index][1]
            for index in range(len(points))
        )
        / 2
    )


def format_number(value: float) -> str:
    rounded = round(value, 3)
    return str(int(rounded)) if rounded.is_integer() else f"{rounded:.3f}".rstrip("0").rstrip(".")


def polygon_points(points: list[Point]) -> str:
    return " ".join(f"{format_number(x)},{format_number(y)}" for x, y in points)


def all_points(polygons: dict[str, list[Point]]) -> list[Point]:
    return [point for polygon in polygons.values() for point in polygon]


def normalize_orientation(polygons: dict[str, list[Point]]) -> dict[str, list[Point]]:
    """Remove the arbitrary whole-figure rotation used to fit a diagram in the PDF cell."""
    edge_angles: list[float] = []
    for polygon in polygons.values():
        for index, (x, y) in enumerate(polygon):
            next_x, next_y = polygon[(index + 1) % len(polygon)]
            edge_angles.append(degrees(atan2(next_y - y, next_x - x)))

    def modulo_45(angle: float) -> float:
        return ((angle + 22.5) % 45) - 22.5

    candidates = [modulo_45(angle) for angle in edge_angles]
    rotation = min(candidates, key=lambda candidate: sum(abs(modulo_45(angle - candidate)) for angle in edge_angles))
    if abs(rotation) < 0.001:
        return polygons

    points = all_points(polygons)
    center_x = sum(x for x, _ in points) / len(points)
    center_y = sum(y for _, y in points) / len(points)
    angle = -rotation * pi / 180
    cosine, sine = cos(angle), sin(angle)
    return {
        piece: [
            (
                center_x + (x - center_x) * cosine - (y - center_y) * sine,
                center_y + (x - center_x) * sine + (y - center_y) * cosine,
            )
            for x, y in polygon
        ]
        for piece, polygon in polygons.items()
    }


def transformed_polygons(polygons: dict[str, list[Point]], canvas_size: int) -> dict[str, list[Point]]:
    points = all_points(polygons)
    min_x = min(x for x, _ in points)
    max_x = max(x for x, _ in points)
    min_y = min(y for _, y in points)
    max_y = max(y for _, y in points)
    scale = (canvas_size - MASK_PADDING * 2) / max(max_x - min_x, max_y - min_y)
    offset_x = (canvas_size - (max_x - min_x) * scale) / 2 - min_x * scale
    offset_y = (canvas_size - (max_y - min_y) * scale) / 2 - min_y * scale
    return {
        piece: [(x * scale + offset_x, y * scale + offset_y) for x, y in polygon]
        for piece, polygon in polygons.items()
    }


def rasterize(polygons: dict[str, list[Point]], canvas_size: int) -> tuple[list[list[int]], list[list[int]]]:
    transformed = transformed_polygons(polygons, canvas_size)
    counts = [[0 for _ in range(canvas_size)] for _ in range(canvas_size)]

    for polygon in transformed.values():
        image = Image.new("1", (canvas_size, canvas_size), 0)
        ImageDraw.Draw(image).polygon(polygon, fill=1)
        pixels = list(image.get_flattened_data())
        for index, filled in enumerate(pixels):
            if filled:
                counts[index // canvas_size][index % canvas_size] += 1

    union = [[1 if value else 0 for value in row] for row in counts]
    return counts, union


def is_connected(mask: list[list[int]]) -> bool:
    height = len(mask)
    width = len(mask[0])
    points = [(x, y) for y, row in enumerate(mask) for x, value in enumerate(row) if value]
    if not points:
        return False

    queue = deque([points[0]])
    seen = {points[0]}
    while queue:
        x, y = queue.popleft()
        for delta_y in (-1, 0, 1):
            for delta_x in (-1, 0, 1):
                next_x, next_y = x + delta_x, y + delta_y
                if (
                    0 <= next_x < width
                    and 0 <= next_y < height
                    and mask[next_y][next_x]
                    and (next_x, next_y) not in seen
                ):
                    seen.add((next_x, next_y))
                    queue.append((next_x, next_y))
    return len(seen) == len(points)


def validate_angles(piece_class: str, polygon: list[Point]) -> None:
    for index, (x, y) in enumerate(polygon):
        next_x, next_y = polygon[(index + 1) % len(polygon)]
        delta_x = abs(next_x - x)
        delta_y = abs(next_y - y)
        tolerance = max(delta_x, delta_y, 1) * 0.002
        is_axis_aligned = delta_x <= tolerance or delta_y <= tolerance
        is_diagonal = abs(delta_x - delta_y) <= tolerance
        if not (is_axis_aligned or is_diagonal):
            raise ValueError(f"Klocek {piece_class} ma krawedz poza katami 0, 45 lub 90 stopni.")


def validate_figure(figure_number: int, polygons: dict[str, list[Point]], area_ratios: dict[str, float]) -> ValidationResult:
    if set(polygons) != set(PIECE_BY_CLASS):
        raise ValueError(f"Figura {figure_number} nie zawiera dokladnie czterech wymaganych klockow.")

    current_areas: dict[str, float] = {}
    for piece_class, polygon in polygons.items():
        style = PIECE_BY_CLASS[piece_class]
        if len(polygon) != style.vertices:
            raise ValueError(
                f"Figura {figure_number}, klocek {piece_class}: {len(polygon)} wierzcholkow zamiast {style.vertices}."
            )
        validate_angles(piece_class, polygon)
        current_areas[piece_class] = polygon_area(polygon)

    blue_area = current_areas["blue"]
    scale_errors = [
        abs(current_areas[piece_class] / blue_area - area_ratios[piece_class]) / area_ratios[piece_class]
        for piece_class in PIECE_BY_CLASS
    ]
    common_scale_error = max(scale_errors)
    if common_scale_error > 0.006:
        raise ValueError(f"Figura {figure_number} ma niespojne skale klockow ({common_scale_error:.4f}).")

    counts, union = rasterize(polygons, 512)
    union_area = sum(sum(row) for row in union)
    overlap_area = sum(max(0, value - 1) for row in counts for value in row)
    overlap_ratio = overlap_area / union_area
    connected = is_connected(union)
    if overlap_ratio > 0.015:
        raise ValueError(f"Figura {figure_number} ma nakladanie klockow ({overlap_ratio:.4f}).")
    if not connected:
        raise ValueError(f"Figura {figure_number} nie tworzy jednej spojnej sylwetki.")
    return ValidationResult(figure_number, common_scale_error, overlap_ratio, connected)


def build_validation_mask(polygons: dict[str, list[Point]]) -> list[str]:
    _, union = rasterize(polygons, MASK_SIZE)
    return ["".join("1" if value else "0" for value in row) for row in union]


def write_svg(path: Path, polygons: dict[str, list[Point]], solid: bool) -> None:
    points = all_points(polygons)
    min_x = min(x for x, _ in points) - 2
    min_y = min(y for _, y in points) - 2
    max_x = max(x for x, _ in points) + 2
    max_y = max(y for _, y in points) + 2
    view_box = " ".join(format_number(value) for value in (min_x, min_y, max_x - min_x, max_y - min_y))

    if solid:
        elements = ['  <g fill="#14213d" stroke="#14213d" stroke-width="0.45" stroke-linejoin="round">']
        for piece in PIECES:
            elements.append(
                f'    <polygon data-piece="{piece.piece_class}" points="{polygon_points(polygons[piece.piece_class])}" />'
            )
        elements.append("  </g>")
    else:
        elements = ['  <g stroke="#334155" stroke-width="0.55" stroke-linejoin="round">']
        for piece in PIECES:
            elements.append(
                f'    <polygon data-piece="{piece.piece_class}" points="{polygon_points(polygons[piece.piece_class])}" '
                f'fill="{piece.fill}" />'
            )
        elements.append("  </g>")

    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" preserveAspectRatio="xMidYMid meet">\n'
        + "\n".join(elements)
        + "\n</svg>\n",
        encoding="utf-8",
        newline="\n",
    )


def write_typescript(entries: list[str], path: Path) -> None:
    path.write_text(
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
        ") as Record<number, TargetMask>;\n",
        encoding="utf-8",
        newline="\n",
    )


def generate(repository_root: Path) -> list[ValidationResult]:
    data_path = repository_root / "scripts" / "gardner-solution-vectors.json"
    source = json.loads(data_path.read_text(encoding="utf-8"))
    figures = source["figures"]
    if len(figures) != FIGURE_COUNT:
        raise ValueError(f"Oczekiwano {FIGURE_COUNT} figur, otrzymano {len(figures)}.")

    target_directory = repository_root / "public" / "t-puzzle" / "named"
    solution_directory = repository_root / "public" / "t-puzzle" / "named-solutions"
    typescript_path = repository_root / "src" / "games" / "t-puzzle" / "namedGardnerTargets.ts"
    target_directory.mkdir(parents=True, exist_ok=True)
    solution_directory.mkdir(parents=True, exist_ok=True)

    first_polygons = {
        piece: [(float(x), float(y)) for x, y in points]
        for piece, points in figures[0]["pieces"].items()
    }
    first_areas = {piece: polygon_area(points) for piece, points in first_polygons.items()}
    area_ratios = {piece: area / first_areas["blue"] for piece, area in first_areas.items()}

    entries: list[str] = []
    results: list[ValidationResult] = []
    for index, figure in enumerate(figures):
        figure_number = index + 1
        if figure["figureNumber"] != figure_number:
            raise ValueError(f"Nieciagly numer figury: {figure['figureNumber']}.")
        polygons = {
            piece: [(float(x), float(y)) for x, y in points]
            for piece, points in figure["pieces"].items()
        }
        polygons = normalize_orientation(polygons)
        results.append(validate_figure(figure_number, polygons, area_ratios))
        mask_rows = build_validation_mask(polygons)
        number = f"{figure_number:03d}"
        write_svg(target_directory / f"figure-{number}.svg", polygons, solid=True)
        write_svg(solution_directory / f"figure-{number}.svg", polygons, solid=False)

        source_name, polish_name = NAMES[index]
        rows = ",\n".join(f'      "{row}"' for row in mask_rows)
        entries.append(
            "  {\n"
            f"    figureNumber: {figure_number},\n"
            f"    sourceName: {json.dumps(source_name, ensure_ascii=False)},\n"
            f"    name: {json.dumps(polish_name, ensure_ascii=False)},\n"
            f"    mask: {{ figureNumber: {figure_number}, size: {MASK_SIZE}, rows: [\n"
            f"{rows}\n"
            "    ] },\n"
            "  }"
        )

    write_typescript(entries, typescript_path)
    return results


if __name__ == "__main__":
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
    results = generate(root)
    print(
        f"Validated {len(results)} figures: max scale error {max(result.common_scale_error for result in results):.4f}, "
        f"max overlap {max(result.overlap_ratio for result in results):.4f}."
    )
