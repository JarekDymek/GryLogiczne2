# MOW Gry logiczne

Mobilna gra T-Puzzle dla wychowanków Młodzieżowego Ośrodka Wychowawczego
w Malborku. Aplikacja działa jako PWA i zapisuje profile na urządzeniu. Gra
jednoosobowa działa offline, a opcjonalny tryb wieloosobowy łączy urządzenia
przez internet bez zakładania kont.

## Rozgrywka

Gracz układa cztery matematycznie zdefiniowane klocki w jednolitą sylwetkę.
Wzór celu nie pokazuje granic elementów. Dostępne są:

- przeciąganie palcem lub myszą,
- obrót o 45 i 90 stopni,
- odbicie lustrzane,
- magnetyczne wyrównywanie zgodnych krawędzi i narożników,
- odłączanie sklejonego klocka gestem: dotknij dwa razy i przytrzymaj drugi dotyk,
- pełna walidacja geometrii, powierzchni, nakładania i maski celu,
- akceptowanie prawidłowego globalnego obrotu i odbicia,
- animacja startowa rozdzielająca złożoną figurę na cztery klocki.

Plansza zajmuje niemal cały ekran. Pasek celu, timer i sterowanie pozostają
widoczne bez przewijania. Skala jest liczona z rzeczywistego viewportu,
safe-area i wspólnego bounding boxu klocków.

## Poziomy

Każda z trzech rodzin (`Gardner`, `Nob`, `Asymetryczne`) zawiera 34 poziomy po
trzy warianty, czyli 102 grywalne układy. W Gardnerze pierwszych 36 figur ma
polskie nazwy i wektorowe podglądy. Maski figur 103 i 104 pozostają w danych
jako materiał na przyszłe wyzwania.

Następny poziom odblokowuje się po zaliczeniu co najmniej jednego wariantu
bieżącego poziomu. Postęp starszej wersji jest migrowany do aktywnego profilu.

## Stopnie i timer

| Stopień | Limit | Punkty bazowe |
| --- | ---: | ---: |
| `0` | 120 s | 100 |
| `+1` | 90 s | 150 |
| `+2` | 60 s | 225 |
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

W podglądzie celu dostępne są trzy stopnie podpowiedzi: ogólna strategia,
orientacja wybranego klocka oraz granice pełnego rozwiązania. Każdy wykorzystany
stopień obniża wynik rundy o 10%, maksymalnie o 30%. Liczba podpowiedzi trafia
do historii próby, ekranu wyniku, pełnej kopii oraz eksportu CSV.

Zwykła powtórka daje 20% wyniku. Pełna nagroda wraca po rekordzie, trudniejszym
stopniu, pierwszym rozwiązaniu albo w pojedynku. Porażka nie daje punktów.

## Profile i kolekcja

Wersjonowany model danych (`schemaVersion: 4`) zapisuje w `localStorage`:

- pseudonim, numer i grupę,
- avatar, punkty, poziom i serię,
- ukończone warianty i najlepszy stopień,
- osiągnięcia i trzy wyróżnione odznaki,
- skórki, daty zdobycia i aktywną skórkę,
- próby, pojedynki, drużyny i ustawienia.
- wybór mentora, bibliotekę reakcji oraz reguły wydarzeń.

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

### Bezpieczeństwo danych i odzyskiwanie

Profil gracza jest lokalnym profilem aplikacji, a nie kontem Supabase. Dane
profilu znajdują się w `localStorage`, natomiast własne tekstury i grafiki
mentorów w IndexedDB tego samego originu. Zmiana samej ścieżki pod tym samym
originem nie usuwa `localStorage`, ale wyczyszczenie danych witryny lub
reinstalacja połączona z ich usunięciem może skasować jedyną lokalną kopię.

Przy odczycie wadliwego albo uciętego JSON aplikacja zachowuje surowy zapis,
tworzy rekord kwarantanny i blokuje automatyczne nadpisanie. Z ekranu Pomocy
można pobrać surowy zapis, przywrócić pełną kopię albo świadomie rozpocząć od
nowa. Aplikacja nie obiecuje odzyskania danych, które zostały fizycznie usunięte
i nie istnieją w żadnej kopii.

Pełna kopia JSON obejmuje profile, punkty, osiągnięcia, próby, pojedynki,
drużyny, ustawienia, mentorów lokalnych, najlepsze czasy i ustawienia progresji
oraz grafiki IndexedDB. Import jest dostępny w Pomocy także na świeżej
instalacji. Kopię należy pobrać przed odinstalowaniem PWA, wyczyszczeniem danych
witryny lub zmianą telefonu.

## Pomoc

Stały przycisk `Pomoc` na ekranie głównym otwiera osobny, ładowany na żądanie
widok. Zawiera wyszukiwane bez rozróżniania wielkości liter i polskich znaków
instrukcje gry, gestów, podpowiedzi, profili, kopii i odzyskiwania, PWA/offline,
multiplayera oraz paneli wychowawcy i właściciela. Treść jest statyczna i po
zapisaniu bieżącej wersji PWA działa offline.

## Mentorzy i reakcje

Po zakończeniu rundy wybrana postać pokazuje reakcję dopasowaną do sukcesu,
rekordu, odblokowania poziomu, próby w stopniu `Dyrektor` albo końca czasu.
Gracz może wybrać stałego mentora lub automatyczne losowanie spośród postaci,
które już odblokował.

Biblioteka działa pod trasami hash bezpiecznymi dla PWA i GitHub Pages:

- `#/mentors/library` - wszystkie dostępne postacie,
- `#/mentors/:mentorId` - gesty i komunikaty postaci,
- `#/mentors/settings` - wybór postaci oraz przypisania wydarzeń.

Trzej mentorzy systemowi są zawsze dostarczani z aplikacją i nie są nadpisywani
przez katalog zdalny. Mentorów właściciela i ich reakcje przechowuje Supabase.
Tylko zalogowany użytkownik z rolą `owner` może tworzyć szkice, edytować je,
wysyłać grafiki i publikować lub wycofywać postacie. Wychowawca nadal może
lokalnie przypisywać reakcje do wydarzeń, ale nie ma prawa zapisu katalogu.
Zwykły użytkownik może wyłącznie wybrać mentora lub włączyć losowanie.

RLS udostępnia anonimowo tylko aktywnych i opublikowanych mentorów. Storage
`mentor-media` jest prywatny; aplikacja pobiera grafiki przez krótkotrwałe
podpisane adresy. Metadane katalogu są cache’owane w `localStorage`, a pobrane
grafiki w IndexedDB, dlatego ostatnio pobrany katalog działa również bez sieci.
Profile, PIN, punkty, osiągnięcia, historia prób i postęp pozostają wyłącznie na
urządzeniu i nie trafiają do Supabase.

### Studio 12 emocji („zacieszek”)

W widoku wybranego mentora osoba zarządzająca może otworzyć Studio 12 emocji.
Gotowy zestaw obejmuje po cztery reakcje pozytywne, wspierające i korygujące.
Każdą grafikę można wczytać ręcznie z urządzenia. Studio przyjmuje również od
jednego do trzech zdjęć referencyjnych i — po wyraźnej zgodzie — może generować
reakcje osobno lub jako komplet. Zdjęcia nie są wysyłane przy samym wyborze
plików. Pierwsza wygenerowana reakcja staje się portretem nowej postaci. Z
mentora systemowego można utworzyć osobny wariant ownera, bez zmieniania
oryginału.

Generator AI działa jako funkcja Supabase Edge Function z katalogu
`supabase/functions/mentor-generator`. Przeglądarka przekazuje krótko żyjący
token właściciela, funkcja ponownie sprawdza rolę `owner`, a klucz API OpenAI
pozostaje wyłącznie w sekretach serwera. Do wdrożenia ustaw sekrety
`OPENAI_API_KEY` i `APP_ORIGIN` (dla publikacji: `https://jarekdymek.github.io`),
wdroż funkcję i skonfiguruj zwykły klucz `anon` w aplikacji. Adres generatora
jest wyliczany automatycznie z `VITE_SUPABASE_URL`; zmienna
`VITE_MENTOR_GENERATOR_URL` jest tylko opcjonalnym nadpisaniem. Funkcja używa
modelu `gpt-image-2`, przyjmuje od jednego do trzech zdjęć i generuje 12 osobnych
reakcji. Zdjęcia referencyjne nie są zapisywane w bazie ani w Storage.

Publikacja przenosi lokalne obrazy WebP do prywatnego bucketu i zapisuje dane w
`mentor_catalog` oraz `mentor_reactions`. Nie ma klucza `service_role` w
przeglądarce — wszystkie zapisy wykonuje zalogowany klient `anon`, a ich
uprawnienia wymusza RLS po stronie bazy.

Gotową postać można przenieść na inne urządzenie jako plik
`.mentorpack.json`. Pakiet zawiera metadane postaci i wyłącznie grafiki, do
których odwołuje się jej portret lub zestaw reakcji. Import wymaga potwierdzenia.

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

### Gra online

Tryb `Gra online` obsługuje od 2 do 8 urządzeń. Host tworzy sześcioliterowy
kod pokoju, wybiera rodzinę, poziom, wariant i stopień, a pozostali gracze
dołączają kodem albo udostępnionym linkiem. Runda rusza dopiero, gdy wszyscy
połączeni gracze zgłoszą gotowość. Zegar jest synchronizowany próbkami czasu
hosta, start jest wspólny, a po rundzie pokazywany jest ranking czasu i ruchów.

Połączenie wykorzystuje szyfrowany kanał WebRTC. Publiczna usługa PeerJS służy
domyślnie tylko do zestawienia połączenia. Dla wdrożenia zarządzanego przez MOW
można wskazać własny PeerServer zmiennymi Vite:

```text
VITE_PEER_SERVER_HOST
VITE_PEER_SERVER_PORT
VITE_PEER_SERVER_PATH
VITE_PEER_SERVER_SECURE
VITE_PEER_SERVER_KEY
```

Tryb online wymaga dostępu do internetu. Profile, PIN wychowawcy, skórki i
pełna historia prób nie są przesyłane do pokoju; wymieniane są pseudonim,
ustawienia rundy, gotowość i wynik bieżącej próby.

## Panel wychowawcy

Panel jest chroniony PIN-em ustawianym lokalnie. PIN jest haszowany przez
PBKDF2-SHA-256 z losową solą i 210 000 iteracji; starszy hash jest automatycznie
migrowany po poprawnym logowaniu. Po pięciu błędnych próbach panel blokuje się
na 30 sekund. W kodzie nie ma jawnego, stałego PIN-u. Dostępne są profile,
drużyny, ustawienia tekstur i animacji, podgląd danych, pełny eksport/import
JSON z grafikami oraz bezpieczny dla arkuszy eksport CSV.

## Katalog właściciela

Kolorowy katalog wszystkich 306 grywalnych figur jest odseparowany od profili
lokalnych i panelu wychowawcy. Wejście znajduje się pod `#owner`, ale znajomość
adresu nie daje dostępu. Aplikacja wymaga zalogowania przez Supabase Auth, a rolę
`owner` potwierdza funkcja PostgreSQL działająca po stronie backendu. Role
`player`, `educator` i `admin` są odrzucane.

Konfiguracja:

1. Utwórz projekt Supabase i uruchom kolejno migracje
   `supabase/migrations/202607180001_owner_roles.sql` oraz
   `supabase/migrations/202608070001_mentor_catalog.sql`. Druga migracja tworzy
   tabele katalogu, prywatny bucket, indeksy, RLS i polityki owner-only.
2. Utwórz konto właściciela w Supabase Auth i zachowaj jego trwały UUID.
3. W SQL Editor wykonaj instrukcję `insert` podaną na końcu migracji, wpisując
   UUID konta. Tabeli ról nie można modyfikować kluczem `anon`.
4. Ustaw `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` lokalnie według
   `.env.example`. Workflow Pages używa publicznego URL i klucza publishable;
   nie są to sekrety ani klucz `service_role`.
5. Dodaj adres `https://jarekdymek.github.io/GryLogiczne2/` do dozwolonych URL
   przekierowania w Supabase Auth.
6. Ustaw sekrety funkcji i wdróż generator:

   ```bash
   supabase secrets set OPENAI_API_KEY=... APP_ORIGIN=https://jarekdymek.github.io
   supabase functions deploy mentor-generator
   ```

7. Zaloguj się jako owner, otwórz „Mentorzy i reakcje”, dodaj postać, przygotuj
   portret i zestaw 12 reakcji, a następnie użyj przycisku „Opublikuj”. Szkice są
   widoczne tylko dla ownera; opublikowana aktywna postać pojawia się u graczy.

Do chronionego katalogu prowadzi stały przycisk „Panel właściciela” na ekranie
głównym. Link jednorazowy wraca przez parametr `?owner=1`, dzięki czemu fragment
sesji dodawany przez Supabase Auth nie usuwa trasy panelu. Po wymianie sesji
parametry callbacku są czyszczone, odtwarzana jest trasa `#owner`, a dostęp nadal
wymaga potwierdzenia roli przez RPC `current_app_role`.

Panel działa w trybie bezpiecznego wyłączenia: bez obu zmiennych środowiskowych
nie pokazuje formularza ani katalogu. Klucz `service_role` nie jest używany w
przeglądarce i nie może trafić do repozytorium ani sekretów Vite.

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
komponenty ekranów. Testy mentorów obejmują migrację, odblokowania, priorytet
wydarzeń, przypisania, łączenie mentorów systemowych z Supabase, cache,
RLS/Storage i wykluczanie szkiców oraz nieopublikowanych postaci. Osobne testy
obejmują gest odłączania, zachowanie grup,
blokadę ponownego snapowania, kody pokoi, synchronizację zegara, gotowość i
ranking multiplayer.
Testy bezpieczeństwa danych obejmują również uszkodzony i ucięty JSON,
kwarantannę bez nadpisania, migrację realistycznego profilu v2, duplikaty ID,
pełną kopię, routing callbacku ownera i wyszukiwarkę Pomocy.

## PWA i GitHub Pages

- baza Vite: `/GryLogiczne2/`,
- manifest i ikony: `public/manifest.webmanifest`, `public/icons`,
- service worker: `public/sw.js`,
- oficjalne logo: `public/assets/mow-logo.jpg`,
- publikacja: `.github/workflows/deploy-pages.yml`,
- adres: <https://jarekdymek.github.io/GryLogiczne2/>.

Service worker używa wersjonowanego cache, usuwa poprzednie wersje i cache'uje
powłokę, logo, ikony oraz używane wektorowe wzory. Nowy `index.html` jest pobierany
strategią network-first, więc publikacja nie zostaje na starej wersji.
Aplikacja pokazuje komunikat o gotowej aktualizacji. Nowy service worker czeka,
aż użytkownik wybierze `Odśwież`; dopiero wtedy zastępuje poprzednią kompletną
wersję. Zapobiega to mieszaniu starych i nowych lazy chunków podczas rundy.

## Struktura

- `src/App.tsx` - routing widoków i orkiestracja sesji,
- `src/app` - profile, dane, punkty, osiągnięcia, skórki, rankingi i pojedynki,
- `src/app/multiplayer` - protokół pokoju, synchronizacja czasu i transport WebRTC,
- `src/app/mentors` - model postaci, dobór reakcji, media i routing biblioteki,
- `src/app/help` - statyczne tematy, normalizacja i wyszukiwanie Pomocy,
- `src/app/screens` - osobne ekrany gry,
- `src/games/t-puzzle` - geometria, maski, walidacja, poziomy i testy,
- `src/games/t-puzzle/components/TPuzzleGame.tsx` - pełnoekranowa arena,
- `public/t-puzzle` - aktualne wektorowe podglądy i rozwiązania kontrolne,
- `scripts` - generator wektorowych wzorów Gardnera,
- `.github/workflows` - automatyczny build i publikacja.

Cięższe ekrany i arena są ładowane dynamicznie. Dane masek i rozwiązania mają
osobne chunki produkcyjne.
