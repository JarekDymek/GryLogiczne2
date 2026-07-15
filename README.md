# Gry Logiczne 2

## Puzzle Lab v2

Gałąź `feature/puzzle-lab-v2` jest wersją testową nowej progresji. Zawiera trzy matematyczne rodziny T-puzzle, 36 nazwanych figur Gardnera z polskimi nazwami oraz dalsze warianty dobierane według obliczanej trudności. Podgląd celu jest jednolitą maską bez linii podziału, a magnes wyrównuje zarówno linię krawędzi, jak i najbliższy wspólny narożnik.

Klasyfikacja wszystkich grafik znajduje się w `docs/asset-catalog.md`. Nazwane maski i kolorowe podpowiedzi można odtworzyć poleceniem:

```powershell
./scripts/Generate-NamedGardnerTargets.ps1
```

Webowa aplikacja PWA z grami logicznymi dla wychowanków Młodzieżowego Ośrodka Wychowawczego w Malborku.

Aktualnie głównym modułem jest gra `T-Puzzle`: gracz układa cztery elementarne klocki w zadaną jednolitą sylwetkę. Podgląd celu nie pokazuje linii podziału na klocki, więc zadanie wymaga analizy przestrzennej, rotacji, odbicia i planowania ruchów.

## T-Puzzle

- 4 klocki o geometrii zgodnej z matematycznym wzorem T-puzzle.
- Przesuwanie palcem lub myszą, obrót o 45 i 90 stopni, odbicie lustrzane.
- Walidacja rozwiązania przez geometrię i maski sylwetek, bez prostego sprawdzania „mniej więcej w obszarze”.
- 34 poziomy po 3 warianty, czyli 102 grywalne sylwetki.
- Figury 103 i 104 zostają w zasobach jako materiał bonusowy lub do przyszłej rozbudowy.
- Postęp zapisywany lokalnie w `localStorage`.
- Interfejs projektowany przede wszystkim pod telefony z Androidem i ekrany dotykowe.

## Progresja

Na początku odblokowany jest tylko poziom 1. Każdy poziom ma trzy warianty figur. Do odblokowania następnego poziomu wystarczy poprawnie ułożyć jeden wariant aktualnego poziomu.

Zapis obejmuje:

- najwyższy odblokowany poziom,
- zaliczone warianty,
- wybrany stopień czasu,
- najlepsze czasy wariantów,
- migrację starszego formatu zapisu.

W aplikacji dostępny jest reset postępu zabezpieczony potwierdzeniem.

## Stopnie i czas

Gracz wybiera stopień przed rozpoczęciem próby:

- `0` - 75 sekund,
- `+1` - 60 sekund,
- `+2` - 45 sekund,
- `+3` - 30 sekund,
- `Dyrektor` - 15 sekund.

Timer startuje dopiero po użyciu przycisku startu próby. Po upływie czasu elementy są blokowane, a próbę można rozpocząć ponownie. Ostatnie 10 sekund jest wyróżnione wizualnie.

## Uruchomienie lokalne

```bash
npm ci
npm run dev
```

Domyślnie Vite uruchamia serwer na `127.0.0.1`.

## Testy i build

```bash
npm test
npm run build
```

Build uruchamia `tsc -b` oraz `vite build`.

## PWA i offline

Aplikacja ma manifest PWA, ikony `192x192`, `512x512` oraz ikonę maskowalną. Service worker cache'uje powłokę aplikacji i grafiki 104 sylwetek. Po pierwszym uruchomieniu aplikacja może działać offline w przeglądarce lub po instalacji na ekranie głównym telefonu.

## GitHub Pages

Repozytorium jest przygotowane do publikacji przez GitHub Pages:

- repo: `JarekDymek/GryLogiczne2`,
- ścieżka bazowa Vite: `/GryLogiczne2/`,
- workflow: `.github/workflows/deploy-pages.yml`,
- adres po publikacji: `https://jarekdymek.github.io/GryLogiczne2/`.

Repo zawiera też statyczny fallback `app.html` oraz rootowe `assets`, `icons`, `manifest.webmanifest` i `sw.js`. Dzięki temu aplikacja działa również wtedy, gdy GitHub Pages w ustawieniach repo jest nadal publikowany bezpośrednio z gałęzi `main`, zamiast z artifactu GitHub Actions.

## Struktura katalogów

- `src/games/t-puzzle` - logika gry, geometrii, progresji, walidacji i testy,
- `src/games/t-puzzle/components` - komponent React planszy T-Puzzle,
- `public/t-puzzle/targets` - grafiki 104 sylwetek,
- `t-puzzle/targets` - źródłowy katalog figur zachowany w repo,
- `public/icons` - ikony PWA,
- `assets`, `icons`, `app.html` - statyczny fallback dla obecnego trybu GitHub Pages z gałęzi,
- `public/sw.js` - service worker,
- `docs` - dokumentacja i materiały pomocnicze,
- `.github/workflows/deploy-pages.yml` - publikacja GitHub Pages.
