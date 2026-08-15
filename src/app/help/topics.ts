export type HelpContext = "home" | "recovery";

export interface HelpTopic {
  id: string;
  symbol: string;
  title: string;
  summary: string;
  steps: string[];
  keywords: string[];
  recommendedIn?: HelpContext[];
}

export const HELP_TOPICS: readonly HelpTopic[] = Object.freeze([
  {
    id: "start",
    symbol: "▶",
    title: "Jak rozpocząć grę",
    summary: "Wybierz profil, przygotuj próbę i uruchom planszę.",
    steps: [
      "Na ekranie głównym sprawdź nazwę aktywnego zawodnika i wybierz Graj.",
      "Wybierz rodzinę układanki, dostępny poziom, jeden z trzech wariantów oraz stopień czasowy.",
      "Naciśnij Rozpocznij. Czas i licznik ruchów ruszą wraz z próbą.",
    ],
    keywords: ["graj", "start", "rozpocznij", "plansza", "pierwsza gra"],
    recommendedIn: ["home"],
  },
  {
    id: "setup",
    symbol: "◆",
    title: "Rodzina, poziom, wariant i stopień",
    summary: "Każda rodzina ma 34 poziomy po trzy warianty.",
    steps: [
      "Rodzina określa komplet klocków: Gardner, Nob albo asymetryczny.",
      "Kolejny poziom odblokowuje się po rozwiązaniu wariantu z poziomu bieżącego.",
      "Stopień zmienia limit czasu: 0 — 120 s, +1 — 90 s, +2 — 60 s, +3 — 30 s, Dyrektor — 15 s.",
    ],
    keywords: ["rodzina", "gardner", "nob", "asymetryczny", "poziom", "wariant", "stopien", "czas"],
  },
  {
    id: "move",
    symbol: "↔",
    title: "Przesuwanie klocków",
    summary: "Przeciągnij klocek palcem lub wskaźnikiem.",
    steps: [
      "Dotknij wybranego klocka i przeciągnij go w wolne miejsce.",
      "Sklejona grupa porusza się razem. Zaznaczony klocek ma aktywne przyciski transformacji.",
      "Nakładanie klocków jest blokowane, dlatego po błędnym ruchu element wróci do bezpiecznej pozycji.",
    ],
    keywords: ["ruch", "przesun", "przeciagnij", "palec", "klocek", "grupa"],
  },
  {
    id: "rotate",
    symbol: "↻",
    title: "Obrót o 45° i 90°",
    summary: "Zaznacz klocek, a potem użyj przycisków obrotu.",
    steps: [
      "Dotknij klocka, który chcesz obrócić.",
      "Przyciski 45° wykonują dokładny obrót w lewo lub w prawo, a przyciski 90° — ćwierć obrotu.",
      "Gdy klocek należy do sklejonej grupy, transformacja dotyczy całej grupy.",
    ],
    keywords: ["obrot", "45", "90", "lewo", "prawo", "transformacja"],
  },
  {
    id: "mirror",
    symbol: "◐",
    title: "Odbicie lustrzane",
    summary: "Przycisk Odbij zmienia orientację zaznaczonego elementu.",
    steps: [
      "Zaznacz klocek lub połączoną grupę.",
      "Naciśnij Odbij. Możesz następnie dopasować położenie obrotem i przesunięciem.",
    ],
    keywords: ["odbicie", "lustro", "odbij", "orientacja"],
  },
  {
    id: "snap",
    symbol: "🧲",
    title: "Magnetyczne łączenie",
    summary: "Zgodne krawędzie i narożniki wyrównują się automatycznie.",
    steps: [
      "Przesuń klocek blisko zgodnej krawędzi lub narożnika innego elementu.",
      "Po prawidłowym kontakcie elementy zostaną wyrównane. Połączenie krawędzi tworzy wspólną grupę.",
      "Jeśli ustawienie powodowałoby nakładanie, połączenie nie zostanie wykonane.",
    ],
    keywords: ["magnes", "snap", "polacz", "sklej", "krawedz", "naroznik"],
  },
  {
    id: "detach",
    symbol: "⤢",
    title: "Odłączanie sklejonego klocka",
    summary: "Dotknij dwa razy i przytrzymaj drugie dotknięcie.",
    steps: [
      "Na klocku należącym do grupy wykonaj dwa dotknięcia.",
      "Drugie dotknięcie przytrzymaj, aż pojawi się potwierdzenie odłączenia.",
      "Odłączony klocek ma krótką blokadę ponownego przyciągnięcia, więc można go bezpiecznie odsunąć.",
    ],
    keywords: ["odlacz", "rozlacz", "sklejony", "dwa razy", "przytrzymaj", "gest"],
  },
  {
    id: "hints",
    symbol: "?",
    title: "Podpowiedzi i punktacja",
    summary: "Dostępne są trzy coraz dokładniejsze podpowiedzi.",
    steps: [
      "Otwórz podgląd celu i wybierz Podpowiedź.",
      "Pierwsza opisuje strategię, druga podaje orientację wybranego klocka, a trzecia pokazuje pełny układ.",
      "Każdy użyty stopień zmniejsza wynik rundy o 10%, maksymalnie o 30%.",
    ],
    keywords: ["podpowiedz", "wskazowka", "punkty", "kara", "rozwiazanie"],
  },
  {
    id: "profiles",
    symbol: "☺",
    title: "Profile graczy",
    summary: "Profile, punkty i postępy są przechowywane lokalnie na tym urządzeniu.",
    steps: [
      "Wybierz Profil i skórki, aby zmienić aktywnego zawodnika albo utworzyć następnego.",
      "Każdy profil ma własne punkty, osiągnięcia, postęp, skórkę i mentora.",
      "Profil gracza nie jest kontem Supabase i nie synchronizuje się automatycznie między telefonami.",
    ],
    keywords: ["profil", "konto", "zawodnik", "punkty", "postep", "lokalnie"],
  },
  {
    id: "backup",
    symbol: "⇩",
    title: "Jak wykonać kopię danych",
    summary: "Pełna kopia zawiera profile, historię, ustawienia i lokalne grafiki.",
    steps: [
      "W górnej części Pomocy wybierz Pobierz pełną kopię.",
      "Zapisz plik JSON w bezpiecznym miejscu poza aplikacją, np. w plikach telefonu lub na własnym Dysku.",
      "Wykonaj nową kopię przed odinstalowaniem PWA, wyczyszczeniem danych witryny lub zmianą telefonu.",
    ],
    keywords: ["kopia", "backup", "eksport", "json", "zapisz", "bezpieczenstwo"],
    recommendedIn: ["recovery"],
  },
  {
    id: "reinstall",
    symbol: "↺",
    title: "Odzyskanie po ponownej instalacji",
    summary: "Użyj wcześniej pobranej pełnej kopii; sama reinstalacja nie tworzy kopii.",
    steps: [
      "W Pomocy wybierz Importuj kopię i wskaż plik JSON utworzony wcześniej przez aplikację.",
      "Po potwierdzeniu profile, wyniki i grafiki zostaną odtworzone na urządzeniu.",
      "Jeżeli pamięć witryny została fizycznie usunięta i nie ma kopii, dawnych punktów ani historii nie można wiarygodnie odzyskać.",
    ],
    keywords: ["reinstalacja", "odzyskaj", "utrata", "usuniete dane", "import"],
    recommendedIn: ["recovery"],
  },
  {
    id: "move-device",
    symbol: "⇄",
    title: "Przeniesienie na drugi telefon",
    summary: "Eksportuj pełną kopię na starym urządzeniu i zaimportuj ją na nowym.",
    steps: [
      "Na starym telefonie pobierz pełną kopię z Pomocy.",
      "Przenieś plik na nowy telefon i otwórz tam Gry logiczne.",
      "Wejdź do Pomocy, wybierz Importuj kopię i potwierdź zastąpienie lokalnych danych.",
    ],
    keywords: ["telefon", "przenies", "nowe urzadzenie", "eksport", "import"],
  },
  {
    id: "offline",
    symbol: "◉",
    title: "Tryb offline",
    summary: "Po pełnym załadowaniu aplikacja i pomoc działają bez internetu.",
    steps: [
      "Uruchom aplikację przynajmniej raz z internetem, aby zapisać bieżącą wersję PWA.",
      "Podstawowa gra, lokalne profile i statyczna Pomoc działają offline.",
      "Gra online, logowanie ownera i pobieranie nowych mentorów z Supabase wymagają sieci.",
    ],
    keywords: ["offline", "bez internetu", "pwa", "sieci"],
  },
  {
    id: "update",
    symbol: "⟳",
    title: "Po aktualizacji PWA",
    summary: "Dokończ rundę, a następnie użyj komunikatu o nowej wersji.",
    steps: [
      "Gdy pojawi się banner aktualizacji, zakończ bieżącą rundę.",
      "Wybierz Odśwież. Aplikacja aktywuje kompletną nową wersję i uruchomi ją ponownie.",
      "Aktualizacja kodu nie powinna usuwać lokalnych profili; mimo to warto regularnie wykonywać kopie.",
    ],
    keywords: ["aktualizacja", "odswiez", "nowa wersja", "cache", "pwa"],
  },
  {
    id: "online",
    symbol: "⌁",
    title: "Gra online i kod pokoju",
    summary: "Jedna osoba tworzy pokój, druga dołącza tym samym kodem.",
    steps: [
      "Wybierz Gra online. Gospodarz tworzy pokój i przekazuje widoczny kod drugiej osobie.",
      "Drugi gracz wpisuje kod, wybiera Dołącz i zgłasza gotowość.",
      "Po utracie połączenia wróć do lobby i połącz się ponownie. Gra online wymaga internetu.",
    ],
    keywords: ["online", "pokoj", "kod", "dolacz", "gospodarz", "multiplayer"],
  },
  {
    id: "educator",
    symbol: "⚙",
    title: "Panel wychowawcy",
    summary: "Ustawienia i dane grupy są chronione lokalnym PIN-em.",
    steps: [
      "Na ekranie głównym wybierz ikonę ustawień.",
      "Przy pierwszym wejściu ustaw lokalny PIN; później podawaj ten sam PIN.",
      "Panel pozwala zarządzać profilami i drużynami oraz eksportować, importować i resetować dane.",
    ],
    keywords: ["wychowawca", "pin", "ustawienia", "druzyna", "reset"],
  },
  {
    id: "owner",
    symbol: "▣",
    title: "Panel właściciela",
    summary: "To osobny, chroniony dostęp do katalogu figur i zarządzania mentorami.",
    steps: [
      "Na ekranie głównym wybierz Panel właściciela i wpisz adres konta właściciela.",
      "Otwórz jednorazowy link logowania na tym samym urządzeniu. Po powrocie backend potwierdzi rolę owner.",
      "Sam adres panelu ani zwykły profil gracza nie daje uprawnień właściciela. Logowanie wymaga internetu.",
    ],
    keywords: ["owner", "wlasciciel", "magic link", "email", "mentor", "supabase"],
  },
]);

export function normalizeHelpSearch(value: string): string {
  return value
    .toLocaleLowerCase("pl")
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getHelpTopics(context: HelpContext, query = ""): HelpTopic[] {
  const normalizedQuery = normalizeHelpSearch(query);
  return HELP_TOPICS
    .filter((topic) => {
      if (!normalizedQuery) return true;
      const searchable = normalizeHelpSearch([
        topic.title,
        topic.summary,
        ...topic.steps,
        ...topic.keywords,
      ].join(" "));
      return searchable.includes(normalizedQuery);
    })
    .sort((first, second) => {
      const firstRecommended = first.recommendedIn?.includes(context) ? 1 : 0;
      const secondRecommended = second.recommendedIn?.includes(context) ? 1 : 0;
      return secondRecommended - firstRecommended;
    });
}
