from __future__ import annotations

from math import sqrt
from pathlib import Path
from xml.sax.saxutils import escape


A = 1.0
SQRT2 = sqrt(2)
T_HEIGHT = 6 - 2 * SQRT2
RIGHT_BOTTOM = 2 - SQRT2
INNER_STEP = SQRT2 - 1

SCALE = 170
ORIGIN_X = 210
ORIGIN_Y = 145


Point = tuple[float, float]


def svg_point(point: Point) -> tuple[float, float]:
    x, y = point
    return ORIGIN_X + x * SCALE, ORIGIN_Y + y * SCALE


def points_attr(points: list[Point]) -> str:
    return " ".join(f"{svg_point(point)[0]:.3f},{svg_point(point)[1]:.3f}" for point in points)


def text(x: float, y: float, value: str, class_name: str = "label") -> str:
    return f'<text x="{x:.3f}" y="{y:.3f}" class="{class_name}">{escape(value)}</text>'


def dim(start: Point, end: Point, label: str, label_at: Point, extra_class: str = "") -> str:
    class_name = "dimension" if not extra_class else f"dimension {extra_class}"
    x1, y1 = svg_point(start)
    x2, y2 = svg_point(end)
    tx, ty = svg_point(label_at)
    return "\n".join(
        [
            f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" class="{class_name}"/>',
            text(tx, ty, label, "dimension-label"),
        ],
    )


def polygon(name: str, points: list[Point], label_at: Point) -> str:
    tx, ty = svg_point(label_at)
    return "\n".join(
        [
            f'<polygon points="{points_attr(points)}" class="tile"/>',
            text(tx, ty, name, "tile-label"),
        ],
    )


# The exact T outline from the reference:
# top beam: (0,0) -> (3,0) -> (3,1) -> (2,1)
# stem:     (2,1) -> (2,6-2sqrt(2)) -> (1,6-2sqrt(2)) -> (1,1)
# left beam:(1,1) -> (0,1) -> (0,0)
#
# Four pieces from the reference drawing:
# A: left isosceles right triangle.
# B: central pentagon bounded by the 2sqrt(2)a diagonal.
# C: right top trapezoid.
# D: lower stem trapezoid.
piece_a = [(0, 0), (1, 1), (0, 1)]
piece_b = [(0, 0), (SQRT2, 0), (1 + SQRT2, 1), (2, 1), (2, 2)]
piece_c = [(SQRT2, 0), (3, 0), (3, 1), (1 + SQRT2, 1)]
piece_d = [(1, 1), (2, 2), (2, T_HEIGHT), (1, T_HEIGHT)]


def build_svg() -> str:
    pieces = "\n".join(
        [
            polygon("A", piece_a, (0.28, 0.68)),
            polygon("B", piece_b, (1.28, 0.74)),
            polygon("C", piece_c, (2.48, 0.62)),
            polygon("D", piece_d, (1.38, 2.58)),
        ],
    )

    dimensions = "\n".join(
        [
            dim((0, -0.24), (SQRT2, -0.24), "sqrt(2)a", (0.55, -0.34)),
            dim((SQRT2, -0.24), (3, -0.24), "(3-sqrt(2))a", (1.86, -0.34)),
            dim((-0.18, 0), (-0.18, 1), "a", (-0.36, 0.58)),
            dim((0, 1.18), (1, 1.18), "a", (0.44, 1.34)),
            dim((0.08, 0.92), (0.92, 0.08), "sqrt(2)a", (0.10, 0.42), "diagonal"),
            dim((0.08, 0.08), (1.92, 1.92), "2sqrt(2)a", (0.86, 0.86), "diagonal strong"),
            dim((SQRT2 + 0.08, 0.08), (SQRT2 + 0.92, 0.92), "sqrt(2)a", (1.82, 0.42), "diagonal"),
            dim((2, 1.18), (1 + SQRT2, 1.18), "(sqrt(2)-1)a", (2.02, 1.40)),
            dim((1 + SQRT2, 1.34), (3, 1.34), "(2-sqrt(2))a", (2.52, 1.56)),
            dim((2.18, 1), (2.18, 2), "a", (2.28, 1.58)),
            dim((2.18, 2), (2.18, T_HEIGHT), "(4-2sqrt(2))a", (2.32, 2.78)),
            dim((0.82, 1), (0.82, T_HEIGHT), "(5-2sqrt(2))a", (0.02, 2.52)),
            dim((1, T_HEIGHT + 0.2), (2, T_HEIGHT + 0.2), "a", (1.44, T_HEIGHT + 0.36)),
        ],
    )

    grid_lines = []
    for index in range(4):
        x1, y1 = svg_point((index, 0))
        x2, y2 = svg_point((index, T_HEIGHT))
        grid_lines.append(f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" class="grid"/>')
    for y in [0, 1, 2, T_HEIGHT]:
        x1, y1 = svg_point((0, y))
        x2, y2 = svg_point((3, y))
        grid_lines.append(f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" class="grid"/>')

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="900" viewBox="0 0 1050 900" role="img" aria-labelledby="title desc">
  <title id="title">Poprawiona geometria klasycznej litery T</title>
  <desc id="desc">Klasyczna litera T zlozona z czterech klockow zgodnych ze wzorem: lewego trojkata, centralnego pieciokata, prawego trapezu i dolnego trapezu trzonu.</desc>
  <defs>
    <marker id="arrow" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto-start-reverse">
      <path d="M 0 0 L 9 4.5 L 0 9 z" fill="#172033"/>
    </marker>
    <style>
      .page {{ fill: #f8fafc; }}
      .title {{ font: 800 34px Arial, sans-serif; fill: #101828; }}
      .subtitle {{ font: 500 19px Arial, sans-serif; fill: #475467; }}
      .grid {{ stroke: #d8dee8; stroke-width: 1.2; }}
      .tile {{ fill: #9fc5ff; stroke: #101828; stroke-width: 4; vector-effect: non-scaling-stroke; }}
      .tile-label {{ font: 900 34px Arial, sans-serif; fill: #101828; paint-order: stroke; stroke: #ffffff; stroke-width: 8; }}
      .dimension {{ stroke: #172033; stroke-width: 2.5; marker-start: url(#arrow); marker-end: url(#arrow); }}
      .dimension.diagonal {{ stroke: #344054; }}
      .dimension.strong {{ stroke-width: 3.5; }}
      .dimension-label {{ font: 800 17px Arial, sans-serif; fill: #172033; paint-order: stroke; stroke: #f8fafc; stroke-width: 5; }}
      .legend {{ font: 500 18px Arial, sans-serif; fill: #475467; }}
    </style>
  </defs>
  <rect class="page" width="1050" height="900"/>
  <text x="52" y="56" class="title">Poprawiona litera T z 4 klockow</text>
  <text x="52" y="88" class="subtitle">Odwzorowanie wzoru: szerokosc belki 3a, wysokosc belki a, wszystkie ciecia ukosne pod katem 45 stopni.</text>
  {"".join(grid_lines)}
  {pieces}
  {dimensions}
  <text x="52" y="820" class="legend">Klocki: A - lewy trojkat; B - centralny pieciokat; C - prawy trapez; D - dolny trapez trzonu.</text>
</svg>
'''


def main() -> None:
    output = Path(__file__).with_name("t_geometry_4_tiles.svg")
    output.write_text(build_svg(), encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
