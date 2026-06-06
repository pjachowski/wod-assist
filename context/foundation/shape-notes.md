---
project: WodAssist
context_type: greenfield
created: 2026-05-21
updated: 2026-05-22
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  frs_drafted: 13
  quality_check_status: accepted
product_type: web-app
target_scale:
  users: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: 2026-07-05
  after_hours_only: true
---

# WodAssist — Shape Notes

## Vision & Problem Statement

**Ból:** Osoba trenująca CrossFit z gotowego planu przegląda dzisiejszy trening lub treningi na resztę tygodnia i chce z wyprzedzeniem zdecydować, jakie obciążenie i tempo dobrać. Procentowe wskazówki w planie (np. „5×5 back squat @ 75%") zakładają aktualne 1RM, którego nikt nie odnawia. W metrykach czasowych (AMRAP, EMOM, „for time") nie ma nawet takiego procentowego punktu odniesienia — decyzja jest czysto na pamięć.

**Osoba:** Osoba trenująca w boksie według planu układanego przez trenera (nie programuje sobie sama; przychodzi i wykonuje WOD dnia).

**Moment:** Przegląd treningu — otwiera aplikację, by obejrzeć dzisiejszy trening lub treningi na resztę tygodnia, i chce z wyprzedzeniem wiedzieć „ile na sztangę / w jakim tempie / ile powtórzeń realnie wyciągnę".

**Koszt dziś:** Zgaduje z pamięci, kopiuje wynik z ostatniej podobnej sesji, pyta sąsiada, albo gra zachowawczo i tym samym nie progresuje. Wyniki, które zapisuje (jeśli zapisuje), są martwe — wracają do nich rzadko.

**Insight, którego status quo nie wykorzystuje:**

1. Procenty z planu zakładają świeże 1RM. W praktyce 1RM jest stare. **WodAssist szacuje obciążenie z historii ostatnich realnych prób, nie z deklarowanego 1RM.**
2. **Cross-exercise extrapolation:** mając historyczny pace cardio (np. wiosłowanie 500 m w 2:00) mogę oszacować, ile powtórzeń realnie wyciągniesz w AMRAP-ie tej samej długości albo jaki pace utrzymasz w „for time". To wiązanie między ćwiczeniami i metrykami czasowymi jest tym, czego dzienniki nie robią.
3. **Session-aware fatigue modeling:** sugestia uwzględnia pozycję ćwiczenia w sesji (kumulowane zmęczenie po Part A/B przed Part C), nie traktuje każdego ruchu w izolacji. Dzienniki sugerujące per-ćwiczenie (gdy sugerują) ignorują, że ten sam thruster po piętnastominutowym AMRAP-ie to nie jest ten sam thruster co świeży w Part A.

## User & Persona

**Primary persona:** osoba trenująca CrossFit w boksie według planu układanego przez trenera. Konsumuje plan, nie tworzy go. Przegląda dzisiejszy trening lub treningi na resztę tygodnia i chce z wyprzedzeniem wiedzieć "ile na sztangę / jakim tempem / ile powtórzeń".

## Access Control

- **Logowanie:** email + hasło. Każdy użytkownik ma własne konto, własną historię i własne plany.
- **Role:** jedna płaska rola. Brak trenerów, administratorów, współdzielenia. Użytkownik widzi wyłącznie swoje dane.
- **Reset hasła:** użytkownik może zresetować hasło przez link wysłany na zarejestrowany email (FR-004).
- **Weryfikacja emaila przy rejestracji:** nie w MVP — patrz Non-Goals. Decyzja: prosty kompromis MVP po godzinach. Reset hasła chroni przed scenariuszem „zapomniałem = nowe konto", weryfikacja emaila to dodatkowy ekran i integracja dla wartości względnie niskiej w MVP.

## Success Criteria

### Primary (MVP się udaje, gdy…)

**Pierwszy flow ukończony przez użytkownika bez wsparcia twórcy:**

1. Użytkownik rejestruje konto (email + hasło).
2. Wkleja plan treningowy w czystym tekście (np. tydzień z Comptraina / od trenera).
3. AI próbuje podzielić plan na dni i wyciągnąć ćwiczenia oraz wartości RX (best effort). Użytkownik może edytować ręcznie — poprawiać błędną interpretację, dopisywać, przesuwać.
4. Otwiera dzień, którego dziś trenuje. Dla każdego ćwiczenia widzi sugestię obciążenia / liczby powtórzeń / szacunkowego czasu. Pierwsze sugestie opierają się na RX z planu; kolejne biorą historię użytkownika.
5. Wykonuje sesję i wpisuje realne wyniki.
6. Wyniki lądują w historii i karmią kolejne sugestie (model "uczy się" użytkownika z każdą sesją).

**Jakość AI:** co najmniej 70% sugestii mieści się w przedziale ±20% od realnego wyniku użytkownika. (Mierzone na własnej historii twórcy plus kilku użytkowników pilotażowych.)

### Secondary (jeśli starczy czasu)

Po wpisaniu realnego wyniku, na ekranie końca sesji użytkownik widzi porównanie sugestii AI vs. realny wynik (np. „AI sugerowało 60 kg, zrobiłeś 65 kg — +8%"). Buduje zaufanie i daje materiał do iteracji modelu.

### Guardrails (czego MVP NIE może złamać)

- **Prywatność:** dane historyczne i plany są widoczne wyłącznie dla właściciela konta. Żadnego współdzielenia, eksportu, indeksowania.
- **Mobile web:** wpisywanie wyników po sesji musi być obsługiwalne jedną ręką na telefonie w sali treningowej; przeglądanie planu i sugestii ma być wygodne na telefonie, bez twardego wymogu obsługi jedną ręką. Brak tego = brak realnego użycia.
- **Brak halucynacji przy braku danych:** gdy AI nie ma podstawy do sugestii (cold start na ćwiczeniu którego nie było w ankiecie ani w historii), mówi to wprost („za mało danych — zacznij od lekkiego obciążenia") zamiast wymyślać liczby. Zaufanie zburzone na pierwszej fałszywej sugestii nie wraca.

## Timeline budget

- **mvp_weeks:** 3 tygodnie po godzinach.
- **Scope-down zaakceptowany:** parser w wersji „best effort" + edycja ręczna (zamiast „perfect parser" gate); RX z planu zamiast ankiety cold-startowej; **pace cardio jako osobna sugestia wycięty z MVP** (wraca w v2 — patrz Non-Goals).

---

> _Checkpoint: Faza 3 (Dyscyplina MVP) ukończona._

## Functional Requirements

### Konto i dostęp

- FR-001: Użytkownik może zarejestrować konto przy użyciu adresu email i hasła. Priority: must-have
  > Socrates: Counter-argument considered: brak — rejestracja email+hasło to standard MVP, stoi jak napisane.
- FR-002: Użytkownik może zalogować się na swoje konto i pozostać zalogowany przez dłuższą sesję (≥ 30 dni „remember me" / długoterminowy refresh) — logowanie co WOD to tarcie zabijające realne użycie. Priority: must-have
  > Socrates: Counter-argument considered: "logowanie co dzień to tarcie w sali treningowej". Resolution: zaakceptowane — FR uzupełniony o długą sesję / remember me jako część zachowania logowania.
- FR-003: Użytkownik widzi wyłącznie własne plany i historię — dane nie wyciekają między kontami. Priority: must-have
  > Socrates: Counter-argument considered: "współdzielenie planów (trener↔podopieczny) byłoby silniejszą propozycją wartości". Resolution: dobry pomysł, ale wykracza poza MVP — dopisane do Non-Goals z notatką „rozważyć w v2".
- FR-004: Użytkownik może zresetować hasło — po podaniu zarejestrowanego adresu email otrzymuje link do ustawienia nowego hasła. Brak weryfikacji emaila przy rejestracji w MVP. Priority: must-have
  > Socrates: Counter-argument considered: "brak weryfikacji emaila otwiera drogę do kont na fałszywe adresy". Resolution: zaakceptowane jako koszt MVP — bez resetu „zapomniałem hasła = nowe konto" zabija ciągłość historii; pełna weryfikacja emaila wraca w v2 razem z innymi elementami hygiene.

### Plany treningowe

- FR-010: Aplikacja podczas parsowania planu wyciąga (gdy obecne w tekście) wartości RX — zalecane obciążenie, liczba powtórzeń, czas, schemat AMRAP/EMOM. RX z planu to pierwszy punkt odniesienia dla sugestii AI; nie wymagamy żadnej ankiety startowej. Priority: must-have
  > Socrates: Counter-argument considered: "ankieta startowa z 3-5 wynikami referencyjnymi". Resolution: odrzucone na korzyść RX z planu — wartości RX dają naturalny punkt wejścia bez friction onboardingu i bez ryzyka, że nowicjusz wpisze zmyślony 1RM.
- FR-020: Użytkownik może wkleić tekst planu treningowego (jeden lub wiele dni — pojedynczy dzień lub cały tydzień). Priority: must-have
  > Socrates: Counter-argument considered: brak kontrargumentu dla samego wklejenia. Dodatkowo wypłynął dylemat: niektóre plany tygodniowe mieszają sesje beginners + normal class w jednym dokumencie — czy użytkownik sam wybiera swoje sesje, czy aplikacja rozróżnia? Zapisane do Open Questions; FR-020 stoi.
- FR-021: Aplikacja próbuje automatycznie wyciągnąć z tekstu osobne dni treningowe i listę ćwiczeń każdego dnia (best effort). Gdy plan dnia zawiera dodatkowy, jawnie oznaczony blok dla początkujących (np. nagłówek „beginners:" pod właściwym treningiem dnia), parser pomija ten blok — MVP obsługuje wyłącznie sesje dla standardowej klasy. Priority: must-have
  > Socrates: Counter-argument considered: „mixed plans (beginners + normal class w jednym dokumencie) — czy parser rozróżnia automatycznie, czy zostawiamy wybór użytkownikowi?". Resolution: parser auto-filtruje — bierze treningi standardowej klasy, pomija „beginners:" bloki. Powód: persona MVP to osoba trenująca w boksie wg planu trenera dla standardowej klasy; początkujący w tym etapie nie potrzebują takiej aplikacji.
- FR-022: Użytkownik może edytować ćwiczenia w sparsowanym dniu prostym formularzem tekstowym (edycja pojedynczego pola: nazwa ćwiczenia, ciężar/powt./czas RX). Brak drag-drop, brak reorderowania w MVP — gdy parser pomyli kolejność, użytkownik wkleja od nowa. Priority: must-have
  > Socrates: Counter-argument considered: "edycja ręczna to dużo UI do zbudowania". Resolution: zaakceptowane — FR doprecyzowany do najprostszej możliwej formy edycji pola; zaawansowane operacje (reorder, drag-drop, „popraw promptem") wykluczone z MVP.
- FR-023: Użytkownik widzi historię swoich planów / dni i może otworzyć konkretny dzień. Główny ekran aplikacji to „dziś trenuję" (najbliższa lub bieżąca sesja na pierwszym planie); lista planów jest nawigacją pomocniczą. Priority: must-have
  > Socrates: Counter-argument considered: "główny ekran powinien być 'dziś trenuję', nie lista planów". Resolution: zaakceptowane — FR uzupełniony o priorytet IA (main = today's session, secondary = plan history).

### Sugestie AI (przegląd sesji)

- FR-030: Dla każdej części / ćwiczenia w wybranym dniu aplikacja sugeruje obciążenie i/lub szacunkową liczbę powtórzeń lub czas — opierając się na RX z planu (gdy dane), historii sesji użytkownika (gdy istnieje) **oraz kontekście całej sesji** (sugestie uwzględniają kumulowane zmęczenie po wcześniejszych częściach WOD-a, nie traktują każdego ćwiczenia w izolacji). Priority: must-have
  > Socrates: Counter-argument considered: "sugerowanie każdego ćwiczenia osobno ignoruje zmęczenie z wcześniejszych ćwiczeń". Resolution: zaakceptowane — FR uzupełniony o wymóg modelowania sesji jako całości, a nie pojedynczych ruchów w izolacji.
- FR-031: Gdy aplikacja nie ma podstaw do sugestii (brak RX w planie i brak historii dla danego wzorca ruchu), mówi to wprost zamiast wymyślać liczby. Priority: must-have
  > Socrates: Counter-argument considered: "edge case jest rzadki, jeśli FR-010 (RX z planu) działa". Resolution: zgoda — to edge case, ale właśnie dlatego MUSI być jawnie obsłużony; pojedyncza halucynacja niszczy zaufanie do produktu na dobre.

### Zapis wyników i feedback

- FR-040: Użytkownik wpisuje realne wyniki sesji zgodnie ze strukturą WOD-a — np. dla treningu „Part A: bench press, find heavy 1RM" wpisuje pojedynczy ciężar; dla „Part B: EMOM 10 min, 5 thrusters @60kg" wpisuje ciężar (i ew. rundy ukończone); dla „Part C: AMRAP 20" wpisuje liczbę rund / powtórzeń lub czas. Wynik jest per część sesji, niekoniecznie per ćwiczenie. Priority: must-have
  > Socrates: Counter-argument considered: "wpisywanie 6-10 pól po treningu to żmudne". Resolution: odrzucone — wpisanie 1-3 wyników per sesja (tyle ile części) jest realne; granularność dopasowana do struktury WOD-a redukuje friction.
- FR-041: Wyniki są zapisywane w historii i karmią kolejne sugestie. W MVP wszystkie wpisy historyczne ważone równo — brak heurystyk wykrywania wartości odstających, brak ważenia recencyjnego, brak ręcznego flagowania „zły dzień / deload / choroba". Priority: must-have
  > Socrates: Counter-argument considered: „wartości odstające w historii (PR sprzed roku, sesja po chorobie) zaburzą sugestie, jeśli wszystkie wpisy traktowane równo". Resolution: zaakceptowane jako świadomy kompromis MVP — heurystyki wagowania wprowadzają złożoność modelu i UI (pole „jak się czułem", flagowanie) bez liniowego wpływu na MVP value prop; zaczynamy od najprostszej polityki i obserwujemy, czy w praktyce sugestie odjeżdżają. Wraca jako temat w v2.
- FR-042: Po zapisaniu sesji użytkownik widzi porównanie sugestii AI vs. realny wynik. Framing tonalny: gdy realny ≥ sugestia, wynik pokazany jako pozytywny progres („zrobiłeś +8% nad sugestię"); gdy realny < sugestia, framing jest neutralny / informacyjny („dziś poszło lżej — uwzględnimy w kolejnych sugestiach"), nie wytykający minusu. Priority: nice-to-have
  > Socrates: Counter-argument considered: "negatywne porównanie demotywuje". Resolution: zaakceptowane — FR uzupełniony o asymetryczny tonalny framing.

## User Stories

### US-01: Pierwsza pełna sesja z aplikacją

**Given** użytkownik jest nowy w aplikacji i właśnie założył konto (email + hasło)
**When** wkleja tekst tygodniowego planu treningowego (np. pięć WOD-ów z opisem RX), aplikacja parsuje go LLM-em i wyświetla wykryte dni z listą ćwiczeń, a użytkownik otwiera „dziś trenuję" i widzi sesję bieżącego dnia z sugestiami obciążeń opartymi na wartościach RX z planu
**Then** dla każdej części sesji widzi konkretną sugestię (np. „Part A — Bench press: sugerowane 80 kg na heavy single, na podstawie RX z planu"), wykonuje sesję, wpisuje realne wyniki per część (1-3 pola na sesję), i wyniki lądują w historii — przy następnej sesji z back squat (za 3-4 dni) AI uwzględnia ten wynik w nowej sugestii.

### US-02: Druga sesja — AI uczy się użytkownika

**Given** użytkownik ma już 3-5 sesji w historii dla części wzorców ruchu
**When** otwiera nowy dzień treningowy, w którym Part B to AMRAP 12 zawierający thrustery
**Then** dla każdej części sesji widzi sugestię uwzględniającą (a) RX z planu, (b) jego historyczne wyniki w tym wzorcu ruchu, (c) kumulowane zmęczenie z wcześniejszych części tej sesji — np. „w Part B masz po 8-minutowej rozgrzewce, zakładamy 80% twojego thrustera 1RM = ~50 kg, szacujemy 8-9 rund". Po wpisaniu rzeczywistego wyniku (6 rund) widzi porównanie w framingu neutralnym („mniej rund niż przewidywano — uwzględnimy w kolejnej sesji").

### US-03: Edge case — brak danych dla nieznanego ruchu

**Given** użytkownik ma historię w głównych ruchach (squat, deadlift, thruster), ale dzisiejszy WOD zawiera turkish get-up — ruch, którego użytkownik nigdy nie wykonał i którego plan nie definiuje RX
**When** otwiera dzisiejszą sesję
**Then** aplikacja w polu sugestii dla turkish get-up jawnie mówi „za mało danych — zacznij od lekkiego obciążenia i podaj wynik" zamiast wymyślać liczby; FR-031 (anti-halucynacja) jest tu testem zaufania.

## Open Questions

Pytania, które wypłynęły podczas shapingu i pozostają nierozstrzygnięte na poziomie PRD — `/10x-prd` przeniesie je do swojej sekcji Open Questions.

_(Pytania produktowe — weryfikacja emaila + reset hasła, mixed plans beginners/normal, wartości odstające w historii — rozstrzygnięte w iteracji po shape-notes i zaszyte odpowiednio w FR-004, FR-021, FR-041 oraz w Non-Goals. Brak zaległych pytań produktowych.)_

---

> _Checkpoint: Faza 4 (FR + User Stories + Socrates) ukończona._

## Business Logic

**Reguła w jednym zdaniu:** Na bazie historycznych wyników użytkownika i wartości RX z planu, aplikacja przy przeglądaniu dnia treningowego (dzisiejszego lub nadchodzącego) sugeruje konkretne obciążenie / liczbę powtórzeń / czas dla każdej części WOD-a, uwzględniając kumulowane zmęczenie w trakcie sesji — każdy wpisany wynik karmi model, więc sugestie ewoluują z tygodnia na tydzień.

**Wejścia (user-facing):**

1. **RX z planu** — wartości zalecane przez autora planu (np. „5×5 back squat @ 75%", „21-15-9 thrusters @ 43 kg", „AMRAP 20: 5 pullups, 10 pushups, 15 air squats"). Punkt odniesienia, gdy brak własnej historii dla danego ruchu.
2. **Historia wyników użytkownika** — wszystkie wpisane do tej pory rezultaty, zorganizowane per część sesji (Part A: 1RM = 90 kg, Part B: AMRAP 12 = 6 rund @ 50 kg, …). Każda nowa sesja powiększa ten zbiór.
3. **Struktura bieżącej sesji** — kolejność i typ kolejnych części WOD-a (strength → conditioning → accessory). Pozycja konkretnego ćwiczenia w sesji kształtuje sugerowane obciążenie (thruster w Part C po 15 min AMRAP-a w Part B nie jest tym samym thrusterem, co świeży thruster w Part A).

**Wyjście (user-facing):**

Dla każdej części WOD-a, w widoku dnia (domyślnie „dziś trenuję"), konkretna sugestia w formacie dopasowanym do typu:

- Strength („find 1RM / heavy single") → sugerowane obciążenie z marginesem rozgrzewki: „Spróbuj 85 kg na 1RM (ostatnio 80 kg na 5)".
- EMOM / interwał → sugerowane obciążenie + uwaga o intensywności: „45 kg na thruster, tempo 75% maxa — utrzymujesz przez 10 min".
- AMRAP / for time → sugerowane obciążenie + szacunkowy wynik („~6 rund w 12 min").
- Edge case (brak danych) → jawne przyznanie: „Za mało danych — zacznij od lekkiego obciążenia i zapisz wynik".

**Self-improvement loop:**

Każdy wpisany wynik (FR-040) jest nowym sygnałem dla modelu (FR-041). Trafność sugestii (FR-042) mierzona w czasie — cel mierzalny: 70% sugestii ±20% od realnego wyniku po N tygodniach użycia. Im więcej sesji w historii, tym ostrzejsze sugestie.

**Jak użytkownik to widzi w produkcie:**

Punktem wejścia jest główny widok „dziś trenuję" — sesja dnia, dla każdej części obok nazwy ćwiczenia widoczna sugestia AI, pod nią pole na wpisanie realnego wyniku; z niego użytkownik przechodzi do pozostałych dni tygodnia, z których każdy ma własne sugestie do przejrzenia z wyprzedzeniem. Po zapisaniu wyników pojawia się porównanie (FR-042). Historia nie jest osobnym widokiem powracającym — działa pod spodem.

## Non-Functional Requirements

- **Czas reakcji sugestii:** od momentu otwarcia widoku dnia do pojawienia się sugestii dla wszystkich części sesji upływa na tyle krótko, by przeglądanie pozostało płynne — orientacyjnie do 5 sekund w typowym warunku (mobilne 4G, średni rozmiar planu — 3-4 części). Moment użycia to spokojny przegląd treningu, nie decyzja przy sztandze — próg jest miękki, ale chroniczne czekanie zniechęca do przeglądania kolejnych dni.
- **Trafność sugestii:** co najmniej 70% sugestii AI mieści się w przedziale ±20% od realnego wyniku użytkownika, mierzone na zebranych danych pilotażowych po N tygodniach użycia. (Pokrywa się z Primary success criterion — pinned tu jako mierzalna jakość, nie samo kryterium sukcesu.)
- **Prywatność danych użytkownika:** dane treningowe (plany, historia wyników) nie opuszczają systemu poza wywołaniami do dostawcy LLM niezbędnymi do parsowania planu i generowania sugestii. Brak eksportu, brak indeksowania, brak udostępniania osobom trzecim, brak elementów społecznościowych.
- **Trwałe usunięcie danych (RODO):** użytkownik może w aplikacji uruchomić usunięcie konta wraz ze wszystkimi swoimi planami i wynikami; po potwierdzeniu dane nie są odzyskiwalne.
- **Bezpieczeństwo haseł:** hasła użytkowników nigdy nie są przechowywane w formie czytelnej; nawet w razie wycieku bazy hasła pozostają nieodtwarzalne.
- **Mobile-first UX:** wpisanie wyniku i zatwierdzenie sesji są wykonalne jedną ręką na telefonie trzymanym w sali treningowej — przyciski akcji w zasięgu kciuka, formularze bez zoomowania. Przeglądanie sesji i sugestii ma być wygodne na telefonie, bez twardego wymogu obsługi jedną ręką.

## Open question (NFR)

- **LLM data retention / opt-out** — czy zawartość planów i wyniki użytkowników mogą być wykorzystywane do trenowania modeli dostawcy LLM, czy wymagamy zero-data-retention (opt-out)? Decyzja ma wpływ na wybór dostawcy w stack selection — przeniesione do Open Questions w PRD.

---

> _Checkpoint: Faza 5 (Business Logic + NFR) ukończona._

## Non-Goals

MVP jawnie NIE robi poniższych rzeczy. Lista jest świadoma — każdy punkt to decyzja scope'owa, nie zapomnienie.

**Z notatek wyjściowych:**

- **Import z PDF / zdjęć / plików** — tylko czysty tekst w wklejce. Powód: parser tekstu sam w sobie jest ryzykiem MVP; dodanie OCR / wyciągania z PDF eksploduje zakres.
- **Generowanie planów treningowych przez AI od zera** — aplikacja konsumuje plany, nie programuje. Powód: programowanie planów wymaga zupełnie innej domeny (periodyzacja, deload, splity) i sprzecznych celów z głównym value prop.
- **Wykresy progresu, estymacje 1RM, śledzenie makroskładników** — historia istnieje, ale nie ma wizualizacji. Powód: użytkownik konsumuje sugestie przed sesją, nie analizuje danych post-hoc; wykresy to inny use case.
- **Elementy społecznościowe** — brak udostępniania wyników, leaderboardów, friend feeds. Powód: privacy guardrail + scope'owa dyscyplina.
- **Integracje z urządzeniami** (Garmin, Apple Health, Whoop, Polar) — żadnych. Powód: każda integracja = osobny projekt; off-MVP.
- **Powiadomienia i przypomnienia** — żaden push / email reminder o sesji. Powód: dodatkowa infrastruktura (push notif service) bez liniowego wpływu na value prop.
- **Natywne aplikacje mobilne** (iOS / Android) — tylko responsywny web. Powód: kwestia kosztu utrzymania i czasu publikacji w storach.

**Wypłynęły w trakcie shapingu:**

- **Współdzielenie planów trener↔podopieczny** — model „jeden użytkownik widzi tylko swoje dane" stoi. Powód: relacja wielu-do-jednego wprowadza role, widoki, uprawnienia. Rozważyć w v2 jako wyraźnie wartościowe rozszerzenie.
- **Pace cardio jako osobna sugestia** (np. „wiosłuj 500 m w 2:00", „biegaj milę pace 5:30/km") — sugestie w MVP obejmują obciążenie / liczbę powtórzeń / czas. Pace cardio występuje wyłącznie jako część RX z planu (gdy autor go zadeklarował) oraz jako sygnał historyczny dla cross-exercise extrapolation (FR-030 — szacowanie liczby rund w AMRAP-ie na bazie historycznego pace'u). Powód: dodanie pace'u jako sugerowanego wymiaru rozszerza model, format wyjścia i UI bez liniowego wpływu na MVP value prop. Wraca w v2.
- **Reorder / drag-drop edycji ćwiczeń** — edycja w MVP jest prymitywna (tekstowa per pole). Powód: zaawansowany edytor odchodzi od „best effort parser + minimalna korekta" w stronę pełnoprawnego edytora planów, co podwoiłoby UI.
- **Cross-user heurystyki / learning** („osoby z twoim back squat 1RM robią X") — sugestie są wyłącznie per-user. Powód: wymagałoby telemetrycznego zbierania danych i agregacji; otwiera dyskusję privacy + GDPR; off-MVP.
- **Ankieta startowa (cold start z 3-5 wynikami referencyjnymi)** — wycięta. Powód: wartości RX z planu treningowego stanowią naturalny punkt odniesienia bez friction onboardingu i bez ryzyka, że nowicjusz wpisze zmyślone 1RM.
- **Weryfikacja emaila przy rejestracji** — w MVP brak. Powód: kompromis MVP po godzinach. Reset hasła (FR-004) chroni przed scenariuszem „zapomniałem hasła = nowe konto"; pełna weryfikacja emaila to dodatkowy ekran, integracja z mailingiem i flow potwierdzenia — wraca w v2 razem z innymi elementami hygiene (np. rate-limiting prób logowania).
- **Obsługa sesji dla początkujących (beginners blocks)** — parser pomija jawnie oznaczone bloki „beginners:" w wklejanych planach (FR-021). Powód: persona MVP to osoba trenująca standardową klasę CrossFit wg planu trenera; początkujący w tym etapie nie potrzebują tego typu aplikacji — model i UI optymalizowane pod jeden poziom.
- **Heurystyki ważenia historii treningowej** — wszystkie wpisy historyczne ważone równo (FR-041). Powód: heurystyki (ważenie recencyjne, wykrywanie wartości odstających, ręczne flagowanie „zły dzień") wprowadzają złożoność modelu i UI bez liniowego wpływu na MVP value prop. Wraca jako temat w v2, jeśli w praktyce sugestie zaczną odjeżdżać.

---

> _Checkpoint: Faza 6 (Product framing + Non-Goals) ukończona._

## Quality cross-check

Wszystkie elementy miękkiej bramki obecne — stan **accepted**, bez zaległych luk do mirroringu w PRD Open Questions:

- Access Control: present
- Business Logic (jedno-zdaniowa reguła): present
- Project artifacts (shape-notes z checkpointem): present
- Timeline-cost acknowledgment: present (3 tygodnie w buforze do hard deadline'u 2026-07-05)
- Non-Goals: present (12 świadomych punktów)
- Preserved behavior: n/a (greenfield)

Open Questions zebrane w toku shapingu (weryfikacja emaila, mixed plans, outliery w historii, LLM retention) trafią do sekcji Open Questions w PRD osobno — nie są lukami w bramce, są normalnymi pytaniami otwartymi do rozstrzygnięcia na etapie PRD lub implementacji.

---

> _Checkpoint: Faza 7 (Quality cross-check) ukończona._
