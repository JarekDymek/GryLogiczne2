# MOW Gry logiczne

Mobilna, lokalna gra T-Puzzle dla wychowanków Młodzieżowego Ośrodka
Wychowawczego w Malborku. Aplikacja działa jako PWA, zapisuje dane na urządzeniu
i nie wymaga kont internetowych ani zewnętrznego serwera.

## Rozgrywka

Gracz układa cztery matematycznie zdefiniowane klocki w jednolitą sylwetkę.
Wzór celu nie pokazuje granic elementów. Dostępne są:

- przeciąganie palcem lub myszą,
- obrót o 45 i 90 stopni,
- odbicie lustrzane,
- magnetyczne wyrównywanie zgodnych krawędzi i narożników,
- pełna walidacja geometrii, powierzchni, nakładania i maski celu,
- akceptowanie prawidłowego globalnego obrotu i odbicia,
- animacja startowa rozdzielająca złożoną figurę na cztery klocki.

Plansza zajmuje niemal cały ekran. Pasek celu, timer i sterowanie pozostają
widoczne bez przewijania. Skala jest liczona z rzeczywistego viewportu,
safe-area i wspólnego bounding boxu klocków.

## Poziomy

Każda z trzech rodzin (`Gardner`, `Nob`, `Asymetryczne`) zawiera 34 poziomy po
trzy warianty, czyli 102 grywalne układy. W Gardnerze pierwszych 36 figur ma
polskie nazwy i wektorowe podglądy. Figury źródłowe 103 i 104 pozostają w
zasobach na przyszłe wyzwania.

Następny poziom odblokowuje się po zaliczeniu co najmniej jednego wariantu
bieżącego poziomu. Postęp starszej wersji jest migrowany do aktywnego profilu.

## Stopnie i timer

| Stopień | Limit | Punkty bazowe |
| --- | ---: | ---: |
| `0` | 75 s | 100 |
| `+1` | 60 s | 150 |
| `+2` | 45 s | 225 |
| `+3` | 30 s | 350 |
| `Dyrektor` | 15 s | 600 |

Timer jest oparty na czasie końcowym (`Date.now()`), dzięki czemu nie rozjeżdża
się po przejściu telefonu w tło. Ostatnie 10 i 5 sekund mają osobne stany
wizualne. Po upływie czasu interakcja zostaje zablokowana.

## Punkty i doświadczenie

Punktacja znajduje się w `src/app/scoring.ts`. Do bazy dochodzą premie:

- 4 punkty za każdą pozostałą sekundę,
- do 110 punktów za małą liczbę ruchów,
- 75 punktów za brak resetu,
- 125 punktów za pierwszy sukces wariantu,
- 90 punktów za rekord osobisty,
- 175 punktów za komplet trzech wariantów poziomu,
- do 250 punktów za serię zwycięstw.

Zwykła powtórka daje 20% wyniku. Pełna nagroda wraca po rekordzie, trudniejszym
stopniu, pierwszym rozwiązaniu albo w pojedynku. Porażka nie daje punktów.

## Profile i kolekcja

Wersjonowany model danych (`schemaVersion: 3`) zapisuje w `localStorage`:

- pseudonim, numer i grupę,
- avatar, punkty, poziom i serię,
- ukończone warianty i najlepszy stopień,
- osiągnięcia i trzy wyróżnione odznaki,
- skórki, daty zdobycia i aktywną skórkę,
- próby, pojedynki, drużyny i ustawienia.

Skórki:

1. Klasyczna - od początku.
2. Neon - 1000 punktów.
3. Ogień - seria 5 zwycięstw.
4. Lód - 10 zwycięstw bez resetu.
5. Złota - 5 kompletnych poziomów.
6. Dyrektor - sukces w trybie Dyrektor.
7. MOW - 1500 punktów.
8. Mistrz grupy - pierwsze miejsce tygodnia po co najmniej jednym sukcesie.
9. Nocna - 8 sukcesów na `+3` lub `Dyrektor`.
10. Turniejowa - 5 wygranych pojedynków.
11. Własna - lokalna tekstura użytkownika.

Własne obrazy (JPEG, PNG, WebP, maksymalnie 6 MB) są kompresowane do WebP,
ograniczane maską klocka i przechowywane w IndexedDB. Nie są wysyłane na serwer.
Panel wychowawcy może wyłączyć tę funkcję.

Karta zawodnika jest generowana lokalnie jako PNG i może być zapisana lub
udostępniona przez Web Share API.

## Osiągnięcia

`Pierwszy krok`, `Perfekcjonista`, `Bez paniki`, `Bez resetu`, `Szybki umysł`,
`Dyrektor`, `Seria zwycięstw`, `Kolekcjoner`, `Mistrz grupy` i
`Pogromca plansz`. Warunki są centralne w `src/app/achievements.ts`.

## Rywalizacja

Rankingi tygodniowy, miesięczny i ogólny korzystają z dat prób. Remisy
rozstrzygają kolejno punkty, zwycięstwa, nowe warianty, najlepszy czas i
wcześniejsze osiągnięcie wyniku.

Pojedynek na jednym urządzeniu prowadzi gracza A i B przez identyczną próbę.
Ekran przekazania telefonu ukrywa wynik pierwszej rundy. Porównywane są:
sukces, punkty, czas, ruchy i resety. Liga przyznaje 3/1/0 punktów.

Ranking drużyn pokazuje sumę i średnią aktywnego gracza. Wynik drużynowy
normalizuje wielkość grupy i dodaje premie za nowe warianty oraz pojedynki.

## Panel wychowawcy

Panel jest chroniony PIN-em ustawianym lokalnie. W kodzie nie ma jawnego,
stałego PIN-u. Dostępne są profile, drużyny, ustawienia tekstur i animacji,
podgląd danych, eksport/import JSON i CSV oraz resety wymagające potwierdzenia.

## Uruchomienie

```bash
npm ci
npm run dev
```

Lokalny adres zawiera bazę repozytorium:
`http://127.0.0.1:5173/GryLogiczne2/`.

## Walidacja

```bash
npm test
npm run typecheck
npm run build
```

Testy obejmują geometrię i możliwość zbudowania wszystkich grywalnych celów,
kontakty magnetyczne każdego klocka, progresję, timer, punkty, profile,
migracje, rankingi, drużyny, pojedynki, skórki, skalowanie viewportu i główne
komponenty ekranów.

## PWA i GitHub Pages

- baza Vite: `/GryLogiczne2/`,
- manifest i ikony: `public/manifest.webmanifest`, `public/icons`,
- service worker: `public/sw.js`,
- oficjalne logo: `public/assets/mow-logo.jpg`,
- publikacja: `.github/workflows/deploy-pages.yml`,
- adres: <https://jarekdymek.github.io/GryLogiczne2/>.

Service worker używa wersjonowanego cache, usuwa poprzednie wersje i cache'uje
powłokę, logo, ikony oraz katalog figur. Nowy `index.html` jest pobierany
strategią network-first, więc publikacja nie zostaje na starej wersji.

## Struktura

- `src/App.tsx` - routing widoków i orkiestracja sesji,
- `src/app` - profile, dane, punkty, osiągnięcia, skórki, rankingi i pojedynki,
- `src/app/screens` - osobne ekrany gry,
- `src/games/t-puzzle` - geometria, maski, walidacja, poziomy i testy,
- `src/games/t-puzzle/components/TPuzzleGame.tsx` - pełnoekranowa arena,
- `public/t-puzzle` - podglądy, rozwiązania i zasoby figur,
- `docs` - dokumentacja źródeł i walidacji,
- `.github/workflows` - automatyczny build i publikacja.

Cięższe ekrany i arena są ładowane dynamicznie. Dane masek i rozwiązania mają
osobne chunki produkcyjne.
