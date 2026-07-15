# Katalog materiałów graficznych

## Źródła geometrii

| Plik | Klasyfikacja | Zastosowanie |
| --- | --- | --- |
| `T-puzle.jpg` | wzorzec matematyczny | Definicje rodzin Gardner's T, Nob's T i Asymmetric T. |
| `T-puzle-figury.jpg` | zatwierdzona baza Gardnera | 36 nazwanych sylwetek użytych w pierwszych 12 poziomach. Kolory źródłowe są mapowane na kolory klocków aplikacji. |
| `T-puzle-figury zaciemnione.jpeg` | materiał kontrolny | Kontrola obrysów 36 nazwanych figur; nie jest używany bezpośrednio w grze. |

## Materiały pomocnicze

| Plik | Klasyfikacja | Uwagi |
| --- | --- | --- |
| `T-puzle-figury 2.jpg` | fragment katalogu | Figury 81–100 z większego zestawu. |
| `T-puzle-figury 3.jpg` | fragment katalogu | Figury 49–68 z większego zestawu. |
| `Figury 1.png` | fragment katalogu | Figury 1–24; materiał porównawczy. |
| `Figury - kolorowe.jpeg` | archiwum innego oznaczenia kolorów | Nie jest źródłem kolorowych rozwiązań w grze, ponieważ kolory nie odpowiadają tożsamości naszych klocków. |
| `Figury - czarne.jpeg` | archiwum sylwetek | Zachowane do dalszej rekonstrukcji i porównań. |

## Zasoby wygenerowane

- `public/t-puzzle/named` zawiera 36 wektorowych, jednolitych sylwetek SVG bez linii podziału.
- `public/t-puzzle/named-solutions` zawiera 36 wektorowych podpowiedzi SVG z mapowaniem: niebieski trzon, zielony pięciokąt, różowy trójkąt i żółty trapez.
- `public/t-puzzle/targets` i `t-puzzle/targets` zawierają 104 dawne maski. Są zachowane jako archiwum i nie sterują nową progresją Gardnera.
- `public/icons` i `icons` zawierają wyłącznie ikony PWA.

## Zasady dopuszczenia do gry

Figura jest grywalna, gdy korzysta z dokładnie czterech klocków danej rodziny, nie zawiera nakładania pól i ma co najmniej jeden odcinek styku przy każdym dołączonym klocku. Figury generowane przechodzą test geometryczny. Nazwane figury Gardnera pochodzą z zatwierdzonego katalogu i są walidowane względem jednolitej maski.
