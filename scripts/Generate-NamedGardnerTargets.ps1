param(
  [string]$RepositoryRoot = (Split-Path -Parent $PSScriptRoot)
)

Add-Type -AssemblyName System.Drawing

$names = @(
  "Litera T", "Grube T", "Pochylone T", "Pinceta", "Śmigło", "Pentomino Y",
  "Kaldera", "Strzała", "Rampa", "Wesołe dziecko", "Miska", "Schody",
  "Siódemka", "Litera Y", "Litera Z", "Lewe Z", "Laska", "Kolejka linowa",
  "Halabarda", "Harpun", "Miecz", "Tomahawk", "Willa", "Fabryka",
  "Bumerang", "Kij hokejowy", "Torba golfowa", "Średnia torba golfowa",
  "Wysoka torba golfowa", "Putter", "Strug", "Klucz nastawny", "Młotek",
  "Kotwica", "Przycisk do papieru", "Osadzone L"
)

$sourcePath = Join-Path $RepositoryRoot "T-puzle-figury.jpg"
$maskDirectory = Join-Path $RepositoryRoot "public\t-puzzle\named"
$solutionDirectory = Join-Path $RepositoryRoot "public\t-puzzle\named-solutions"
$typescriptPath = Join-Path $RepositoryRoot "src\games\t-puzzle\namedGardnerTargets.ts"
$size = 64

New-Item -ItemType Directory -Force -Path $maskDirectory, $solutionDirectory | Out-Null
$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
$colorPrototypes = @(
  @{ PieceClass = "blue"; R = 240; G = 160; B = 192 },
  @{ PieceClass = "green"; R = 192; G = 176; B = 224 },
  @{ PieceClass = "red"; R = 248; G = 248; B = 160 },
  @{ PieceClass = "yellow"; R = 192; G = 224; B = 128 }
)

function Get-PieceClass([System.Drawing.Color]$color) {
  $maximum = [Math]::Max($color.R, [Math]::Max($color.G, $color.B))
  $minimum = [Math]::Min($color.R, [Math]::Min($color.G, $color.B))
  if (($maximum - $minimum) -lt 20 -or $maximum -lt 100) { return $null }
  $nearestClass = $null
  $nearestDistance = [double]::PositiveInfinity
  foreach ($prototype in $colorPrototypes) {
    $distance = [Math]::Pow($color.R - $prototype.R, 2) + [Math]::Pow($color.G - $prototype.G, 2) + [Math]::Pow($color.B - $prototype.B, 2)
    if ($distance -lt $nearestDistance) {
      $nearestDistance = $distance
      $nearestClass = $prototype.PieceClass
    }
  }
  return $(if ($nearestDistance -le 6500) { $nearestClass } else { $null })
}

function Get-WorkColor([string]$pieceClass) {
  switch ($pieceClass) {
    "blue" { return [System.Drawing.Color]::FromArgb(47, 128, 237) }
    "green" { return [System.Drawing.Color]::FromArgb(34, 197, 94) }
    "red" { return [System.Drawing.Color]::FromArgb(236, 72, 153) }
    "yellow" { return [System.Drawing.Color]::FromArgb(250, 204, 21) }
  }
}

$entries = New-Object System.Collections.Generic.List[string]

for ($index = 0; $index -lt 36; $index++) {
  $column = $index % 6
  $row = [Math]::Floor($index / 6)
  $left = [Math]::Floor($column * $source.Width / 6)
  $right = [Math]::Floor(($column + 1) * $source.Width / 6) - 1
  $top = [Math]::Floor($row * $source.Height / 6)
  $bottom = [Math]::Floor(($row + 1) * $source.Height / 6) - 1
  $pixels = New-Object System.Collections.Generic.List[object]

  for ($y = $top; $y -le $bottom; $y++) {
    for ($x = $left; $x -le $right; $x++) {
      $pieceClass = Get-PieceClass $source.GetPixel($x, $y)
      if ($pieceClass) {
        $pixels.Add([pscustomobject]@{ X = $x; Y = $y; PieceClass = $pieceClass })
      }
    }
  }

  if ($pixels.Count -eq 0) { throw "Nie znaleziono kolorowych klocków dla figury $($index + 1)." }
  $minX = ($pixels | Measure-Object X -Minimum).Minimum
  $maxX = ($pixels | Measure-Object X -Maximum).Maximum
  $minY = ($pixels | Measure-Object Y -Minimum).Minimum
  $maxY = ($pixels | Measure-Object Y -Maximum).Maximum
  $scale = [Math]::Min(50 / [Math]::Max(1, $maxX - $minX + 1), 50 / [Math]::Max(1, $maxY - $minY + 1))
  $offsetX = ($size - ($maxX - $minX + 1) * $scale) / 2
  $offsetY = ($size - ($maxY - $minY + 1) * $scale) / 2
  $pieceLayers = @{}
  foreach ($pieceClass in @("blue", "green", "red", "yellow")) {
    $pieceLayers[$pieceClass] = New-Object 'bool[,]' $size, $size
  }

  foreach ($pixel in $pixels) {
    $targetX = [Math]::Round($offsetX + ($pixel.X - $minX) * $scale)
    $targetY = [Math]::Round($offsetY + ($pixel.Y - $minY) * $scale)
    for ($dy = -2; $dy -le 2; $dy++) {
      for ($dx = -2; $dx -le 2; $dx++) {
        $writeX = $targetX + $dx
        $writeY = $targetY + $dy
        if ($writeX -ge 0 -and $writeX -lt $size -and $writeY -ge 0 -and $writeY -lt $size) {
          $pieceLayers[$pixel.PieceClass][$writeX, $writeY] = $true
        }
      }
    }
  }

  $maskBitmap = New-Object System.Drawing.Bitmap $size, $size
  $solutionBitmap = New-Object System.Drawing.Bitmap $size, $size
  $rows = New-Object System.Collections.Generic.List[string]
  for ($y = 0; $y -lt $size; $y++) {
    $rowText = New-Object System.Text.StringBuilder
    for ($x = 0; $x -lt $size; $x++) {
      $filled = $false
      $pieceAtPixel = $null
      foreach ($pieceClass in @("blue", "green", "red", "yellow")) {
        if ($pieceLayers[$pieceClass][$x, $y]) {
          $filled = $true
          $pieceAtPixel = $pieceClass
        }
      }
      [void]$rowText.Append($(if ($filled) { "1" } else { "0" }))
      $maskBitmap.SetPixel($x, $y, $(if ($filled) { [System.Drawing.Color]::Black } else { [System.Drawing.Color]::White }))
      $solutionBitmap.SetPixel($x, $y, $(if ($pieceAtPixel) { Get-WorkColor $pieceAtPixel } else { [System.Drawing.Color]::White }))
    }
    $rows.Add($rowText.ToString())
  }

  $number = ($index + 1).ToString("000")
  $maskBitmap.Save((Join-Path $maskDirectory "figure-$number.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $solutionBitmap.Save((Join-Path $solutionDirectory "figure-$number.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $maskBitmap.Dispose()
  $solutionBitmap.Dispose()

  $escapedName = $names[$index].Replace('"', '\"')
  $rowSource = ($rows | ForEach-Object { '      "' + $_ + '"' }) -join ",`r`n"
  $entries.Add("  {`r`n    figureNumber: $($index + 1),`r`n    name: `"$escapedName`",`r`n    mask: { figureNumber: $($index + 1), size: $size, rows: [`r`n$rowSource`r`n    ] },`r`n  }")
}

$source.Dispose()
$typescript = @"
import type { TargetMask } from "./targetMasks";

export interface NamedGardnerTarget {
  figureNumber: number;
  name: string;
  mask: TargetMask;
}

export const namedGardnerTargets: NamedGardnerTarget[] = [
$($entries -join ",`r`n")
];

export const namedGardnerTargetMasks = Object.fromEntries(
  namedGardnerTargets.map((target) => [target.figureNumber, target.mask]),
) as Record<number, TargetMask>;
"@
[System.IO.File]::WriteAllText($typescriptPath, $typescript, (New-Object System.Text.UTF8Encoding($false)))
