---
project: WodAssist
version: 1
status: draft
created: 2026-05-22
context_type: greenfield
product_type: web-app
target_scale:
  users: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: 2026-07-05
  after_hours_only: true
---

# WodAssist — PRD

## Vision & Problem Statement

Osoba trenująca CrossFit z planu układanego przez trenera staje tuż przed serią ze sztangą / wiosłem / kettlem i ma około trzydziestu sekund na decyzję „ile ciężaru, jakim tempem, ile powtórzeń zdążę". Procentowe wskazówki w planie (np. „5×5 back squat @ 75%") zakładają aktualne 1RM, którego nikt nie odnawia, a metryki czasowe (AMRAP, EMOM, „for time") nie mają nawet takiego punktu odniesienia. W efekcie użytkownik zgaduje z pamięci, kopiuje wynik z ostatniej podobnej sesji, pyta sąsiada albo gra zachowawczo i nie progresuje. Wyniki, które zapisuje (jeśli zapisuje), są martwe — nie wracają jako wskazówki przy kolejnej sesji.

Insight, którego status quo nie wykorzystuje, ma trzy warstwy. Po pierwsze: procenty z planu zakładają świeże 1RM, ale w praktyce 1RM jest stare — sensowna sugestia powinna wychodzić z historii ostatnich realnych prób, nie z deklarowanego maksa. Po drugie: mając historyczny pace cardio (np. wiosłowanie 500 m w 2:00), można oszacować realną liczbę powtórzeń w AMRAP-ie tej samej długości albo utrzymywany pace w „for time" — wiązanie między ćwiczeniami i metrykami czasowymi to coś, czego dzienniki treningowe nie robią. Po trzecie: w ramach jednej sesji ćwiczenia nie są niezależne — thruster w Part C po piętnastominutowym AMRAP-ie w Part B nie jest tym samym thrusterem co świeży thruster w Part A, więc sugestia musi modelować kumulowane zmęczenie w obrębie sesji.

## User & Persona

**Primary persona:** osoba trenująca CrossFit w boksie według planu układanego przez trenera, uczestnik standardowej klasy (nie początkujący, nie scaled, nie masters). Konsumuje plan, nie programuje sobie sama. Przychodzi z planem na konkretną sesję dnia, otwiera aplikację tuż przed serią i chce wiedzieć „ile na sztangę, jakim tempem, ile powtórzeń realnie wyciągnę" tu i teraz. Po sesji wraca raz — żeby wpisać wyniki — i wychodzi. Nie analizuje wykresów, nie udostępnia wyników, nie ogląda swojej historii dla samej historii.

## Success Criteria

### Primary

- Pierwszy pełny flow przechodzi nowy użytkownik bez wsparcia twórcy: rejestracja konta (email + hasło) → wklejenie planu treningowego w tekście → automatyczne wykrycie dni i ćwiczeń z możliwością ręcznej korekty → otwarcie sesji dnia z sugestiami na każdą część WOD-a → wykonanie sesji → wpisanie realnych wyników → wyniki w historii zasilają kolejne sugestie.
- Trafność sugestii: co najmniej 70% sugestii AI mieści się w przedziale ±20% od realnego wyniku użytkownika, mierzona na danych pilotażowych po N tygodniach użycia.

### Secondary

- Po zapisaniu sesji użytkownik widzi porównanie sugestii vs. realny wynik (np. „sugestia 60 kg, zrobiłeś 65 kg — +8%"). Buduje zaufanie i daje materiał do iteracji modelu.

### Guardrails

- Prywatność: dane historyczne i plany są widoczne wyłącznie dla właściciela konta. Brak współdzielenia, eksportu ani indeksowania.
- Mobile-first UX: kluczowe interakcje są wykonalne jedną ręką na telefonie trzymanym w sali treningowej. Wymuszony zoom, klikanie obu kciuków albo trzymanie telefonu w drugiej ręce = realna porażka produktu.
- Brak halucynacji przy braku danych: gdy nie ma podstawy do sugestii (brak RX w planie i brak historii dla danego wzorca ruchu), aplikacja mówi to wprost zamiast wymyślać liczby. Zaufanie zburzone na pierwszej fałszywej sugestii nie wraca.

## User Stories

### US-01: Pierwsza pełna sesja z aplikacją

- **Given** użytkownik jest nowy w aplikacji i właśnie założył konto (email + hasło)
- **When** wkleja tekst tygodniowego planu treningowego (pięć WOD-ów z opisem RX), aplikacja parsuje plan, pomija ewentualne bloki dla początkujących i wyświetla wykryte dni z listą ćwiczeń standardowej klasy, a użytkownik otwiera ekran „dziś trenuję" i widzi sesję bieżącego dnia z sugestiami opartymi na wartościach RX z planu
- **Then** dla każdej części sesji widzi konkretną sugestię (np. „Part A — Bench press: sugerowane 80 kg na heavy single, na podstawie RX z planu"), wykonuje sesję, wpisuje realne wyniki per część (1–3 pola na sesję), a wyniki lądują w historii — przy następnej sesji, w której pojawi się back squat, sugestia uwzględni ten wynik.

#### Acceptance Criteria

- Główny widok aplikacji po zalogowaniu to „dziś trenuję" (najbliższa lub bieżąca sesja na pierwszym planie); lista planów jest nawigacją pomocniczą.
- Dla każdej części WOD-a w tym widoku widać konkretną sugestię oraz pole do wpisania realnego wyniku.
- Po zapisaniu wyników widać porównanie sugestia vs. realny wynik (FR-042).
- Wpisane wyniki są widoczne w historii i wpływają na kolejne sugestie.

### US-02: Druga sesja — model uczy się użytkownika

- **Given** użytkownik ma już 3–5 sesji w historii dla części wzorców ruchu
- **When** otwiera nowy dzień treningowy, w którym Part B to AMRAP 12 z thrusterami
- **Then** dla Part B widzi sugestię uwzględniającą (a) RX z planu, (b) historyczne wyniki użytkownika dla tego wzorca ruchu, (c) kumulowane zmęczenie z wcześniejszych części tej sesji — przykładowo: „w Part B masz po ośmiominutowej rozgrzewce, zakładamy 80% twojego thrustera 1RM = ~50 kg, szacujemy 8–9 rund". Po wpisaniu rzeczywistego wyniku (6 rund) widzi porównanie w framingu neutralnym („mniej rund niż przewidywano — uwzględnimy w kolejnej sesji").

#### Acceptance Criteria

- Sugestia na drugiej (i kolejnej) sesji wykorzystuje historyczne wyniki użytkownika, nie tylko RX z planu.
- Sugestia uwzględnia pozycję ćwiczenia w sesji (część A vs. C po wcześniejszych częściach), nie traktuje każdej części niezależnie.
- Gdy realny wynik < sugestia, framing porównania jest informacyjny / neutralny, nie wytykający minusu.

### US-03: Edge case — brak danych dla nieznanego ruchu

- **Given** użytkownik ma historię w głównych ruchach (squat, deadlift, thruster), ale dzisiejszy WOD zawiera turkish get-up — ruch, którego użytkownik nigdy nie wykonywał i którego plan nie definiuje RX
- **When** otwiera dzisiejszą sesję
- **Then** w polu sugestii dla turkish get-up aplikacja jawnie mówi „za mało danych — zacznij od lekkiego obciążenia i podaj wynik" zamiast wymyślać liczby; po wpisaniu wyniku ten ruch wchodzi do historii i przy kolejnej sesji z turkish get-upem sugestia już istnieje.

#### Acceptance Criteria

- Gdy aplikacja nie ma RX w planie ANI historii dla danego wzorca ruchu, sugestia jest jawnym komunikatem o braku danych — nigdy konkretną liczbą.
- Po wpisaniu pierwszego wyniku tego ruchu, kolejna sesja zawierająca ten sam ruch ma już sugestię opartą na tym wyniku.

## Functional Requirements

### Konto i dostęp

- FR-001: Użytkownik może zarejestrować konto przy użyciu adresu email i hasła. Priority: must-have
  > Socrates: Counter-argument considered: brak — rejestracja email+hasło to standard MVP, stoi jak napisane.
- FR-002: Użytkownik może zalogować się na swoje konto i pozostać zalogowany przez dłuższą sesję (≥ 30 dni „remember me" / długoterminowy refresh) — logowanie co WOD to tarcie zabijające realne użycie. Priority: must-have
  > Socrates: Counter-argument considered: „logowanie co dzień to tarcie w sali treningowej". Resolution: zaakceptowane — FR uzupełniony o długą sesję / remember me jako część zachowania logowania.
- FR-003: Użytkownik widzi wyłącznie własne plany i historię — dane nie wyciekają między kontami. Priority: must-have
  > Socrates: Counter-argument considered: „współdzielenie planów (trener↔podopieczny) byłoby silniejszą propozycją wartości". Resolution: dobry pomysł, ale wykracza poza MVP — dopisane do Non-Goals z notatką „rozważyć w v2".
- FR-004: Użytkownik może zresetować hasło — po podaniu zarejestrowanego adresu email otrzymuje link do ustawienia nowego hasła. Brak weryfikacji emaila przy rejestracji w MVP. Priority: must-have
  > Socrates: Counter-argument considered: „brak weryfikacji emaila otwiera drogę do kont na fałszywe adresy". Resolution: zaakceptowane jako koszt MVP — bez resetu „zapomniałem hasła = nowe konto" zabija ciągłość historii; pełna weryfikacja emaila wraca w v2 razem z innymi elementami hygiene.

### Plany treningowe

- FR-010: Aplikacja podczas parsowania planu wyciąga (gdy obecne w tekście) wartości RX — zalecane obciążenie, liczbę powtórzeń, czas, schemat AMRAP / EMOM. RX z planu to pierwszy punkt odniesienia dla sugestii; nie wymagamy żadnej ankiety startowej. Priority: must-have
  > Socrates: Counter-argument considered: „ankieta startowa z 3–5 wynikami referencyjnymi". Resolution: odrzucone na korzyść RX z planu — wartości RX dają naturalny punkt wejścia bez friction onboardingu i bez ryzyka, że nowicjusz wpisze zmyślony 1RM.
- FR-020: Użytkownik może wkleić tekst planu treningowego (jeden lub wiele dni — pojedynczy dzień lub cały tydzień). Priority: must-have
  > Socrates: Counter-argument considered: brak kontrargumentu dla samego wklejenia.
- FR-021: Aplikacja próbuje automatycznie wyciągnąć z tekstu osobne dni treningowe oraz listę ćwiczeń każdego dnia (best effort). Gdy plan dnia zawiera dodatkowy, jawnie oznaczony blok dla początkujących (np. nagłówek „beginners:" pod właściwym treningiem dnia), parser pomija ten blok — MVP obsługuje wyłącznie sesje dla standardowej klasy. Priority: must-have
  > Socrates: Counter-argument considered: „mixed plans (beginners + normal class w jednym dokumencie) — czy parser rozróżnia automatycznie, czy zostawiamy wybór użytkownikowi?". Resolution: parser auto-filtruje — bierze treningi standardowej klasy, pomija „beginners:" bloki. Powód: persona MVP to osoba trenująca w boksie wg planu trenera dla standardowej klasy; początkujący w tym etapie nie potrzebują takiej aplikacji.
- FR-022: Użytkownik może edytować ćwiczenia w sparsowanym dniu prostym formularzem tekstowym (edycja pojedynczego pola: nazwa ćwiczenia, ciężar / powt. / czas RX). Brak drag-drop, brak reorderowania w MVP — gdy parser pomyli kolejność, użytkownik wkleja od nowa. Priority: must-have
  > Socrates: Counter-argument considered: „edycja ręczna to dużo UI do zbudowania". Resolution: zaakceptowane — FR doprecyzowany do najprostszej możliwej formy edycji pola; zaawansowane operacje (reorder, drag-drop, „popraw promptem") wykluczone z MVP.
- FR-023: Użytkownik widzi historię swoich planów / dni i może otworzyć konkretny dzień. Główny ekran aplikacji to „dziś trenuję" (najbliższa lub bieżąca sesja na pierwszym planie); lista planów jest nawigacją pomocniczą. Priority: must-have
  > Socrates: Counter-argument considered: „główny ekran powinien być 'dziś trenuję', nie lista planów". Resolution: zaakceptowane — FR uzupełniony o priorytet IA (main = today's session, secondary = plan history).

### Sugestie sesji „live"

- FR-030: Dla każdej części / ćwiczenia w wybranym dniu aplikacja sugeruje obciążenie i/lub szacunkową liczbę powtórzeń lub czas — opierając się na RX z planu (gdy dane), historii sesji użytkownika (gdy istnieje) oraz kontekście całej sesji (sugestia uwzględnia kumulowane zmęczenie po wcześniejszych częściach WOD-a, nie traktuje każdego ćwiczenia w izolacji). Priority: must-have
  > Socrates: Counter-argument considered: „sugerowanie każdego ćwiczenia osobno ignoruje zmęczenie z wcześniejszych ćwiczeń". Resolution: zaakceptowane — FR uzupełniony o wymóg modelowania sesji jako całości, a nie pojedynczych ruchów w izolacji.
- FR-031: Gdy aplikacja nie ma podstaw do sugestii (brak RX w planie i brak historii dla danego wzorca ruchu), mówi to wprost zamiast wymyślać liczby. Priority: must-have
  > Socrates: Counter-argument considered: „edge case jest rzadki, jeśli FR-010 (RX z planu) działa". Resolution: zgoda — to edge case, ale właśnie dlatego MUSI być jawnie obsłużony; pojedyncza halucynacja niszczy zaufanie do produktu na dobre.

### Zapis wyników i feedback

- FR-040: Użytkownik wpisuje realne wyniki sesji zgodnie ze strukturą WOD-a — dla treningu „Part A: bench press, find heavy 1RM" wpisuje pojedynczy ciężar; dla „Part B: EMOM 10 min, 5 thrusters @ 60 kg" wpisuje ciężar (i ew. rundy ukończone); dla „Part C: AMRAP 20" wpisuje liczbę rund / powtórzeń lub czas. Wynik jest per część sesji, niekoniecznie per ćwiczenie. Priority: must-have
  > Socrates: Counter-argument considered: „wpisywanie 6–10 pól po treningu to żmudne". Resolution: odrzucone — wpisanie 1–3 wyników per sesja (tyle ile części) jest realne; granularność dopasowana do struktury WOD-a redukuje friction.
- FR-041: Wyniki są zapisywane w historii i karmią kolejne sugestie. W MVP wszystkie wpisy historyczne ważone równo — brak heurystyk wykrywania wartości odstających, brak ważenia recencyjnego, brak ręcznego flagowania „zły dzień / deload / choroba". Priority: must-have
  > Socrates: Counter-argument considered: „wartości odstające w historii (PR sprzed roku, sesja po chorobie) zaburzą sugestie, jeśli wszystkie wpisy traktowane równo". Resolution: zaakceptowane jako świadomy kompromis MVP — heurystyki wagowania wprowadzają złożoność modelu i UI (pole „jak się czułem", flagowanie) bez liniowego wpływu na MVP value prop; zaczynamy od najprostszej polityki i obserwujemy, czy w praktyce sugestie odjeżdżają. Wraca jako temat w v2.
- FR-042: Po zapisaniu sesji użytkownik widzi porównanie sugestii vs. realny wynik. Framing tonalny: gdy realny ≥ sugestia, wynik pokazany jako pozytywny progres („zrobiłeś +8% nad sugestię"); gdy realny < sugestia, framing jest neutralny / informacyjny („dziś poszło lżej — uwzględnimy w kolejnych sugestiach"), nie wytykający minusu. Priority: nice-to-have
  > Socrates: Counter-argument considered: „negatywne porównanie demotywuje". Resolution: zaakceptowane — FR uzupełniony o asymetryczny tonalny framing.

## Non-Functional Requirements

- **Czas reakcji sugestii:** od momentu otwarcia widoku „dziś trenuję" do pojawienia się sugestii dla wszystkich części sesji upływa mniej niż 3 sekundy w typowym warunku sieciowym mobilnym i przy planie zawierającym 3–4 części. Powyżej tego progu użytkownik traci kontekst sesji.
- **Trafność sugestii:** co najmniej 70% sugestii mieści się w przedziale ±20% od realnego wyniku użytkownika, mierzone na zebranych danych pilotażowych po N tygodniach użycia.
- **Prywatność danych użytkownika:** dane treningowe (plany, historia wyników) nie są udostępniane stronom trzecim, nie są eksportowane, nie są indeksowane do publicznego dostępu, nie są wykorzystywane do żadnego celu poza dostarczeniem wartości właścicielowi konta. Granica „dane mogą opuścić system w wywołaniu do zewnętrznej usługi koniecznej do parsowania lub sugestii" musi być jawnie zadeklarowana wobec użytkownika (treść tej deklaracji do rozstrzygnięcia — patrz Open Questions).
- **Trwałe usunięcie danych:** użytkownik może w aplikacji uruchomić usunięcie konta wraz ze wszystkimi swoimi planami i wynikami; po potwierdzeniu dane nie są odzyskiwalne (zgodność z RODO).
- **Bezpieczeństwo haseł:** hasła użytkowników nigdy nie są przechowywane w formie czytelnej; w razie wycieku składowiska hasła pozostają nieodtwarzalne.
- **Mobile-first UX:** kluczowe interakcje (otwarcie sesji dnia, wpisanie wyniku, zatwierdzenie sesji) są wykonalne jedną ręką na telefonie trzymanym w sali treningowej — akcje w zasięgu kciuka, formularze bez wymuszonego zoomowania.
- **Brak halucynacji w sugestiach:** dla każdego ruchu, dla którego ani plan, ani historia nie dostarczają punktu odniesienia, produkt zwraca jawny komunikat o braku danych zamiast liczby.

## Business Logic

**Reguła w jednym zdaniu:** Na bazie historycznych wyników użytkownika i wartości RX z planu aplikacja przed każdą sesją sugeruje konkretne obciążenie / liczbę powtórzeń / czas dla każdej części WOD-a, uwzględniając kumulowane zmęczenie w trakcie sesji — każdy wpisany wynik zasila kolejne sugestie, więc rekomendacje ewoluują z tygodnia na tydzień.

**Wejścia (user-facing):**

1. **RX z planu** — wartości zalecane przez autora planu (np. „5×5 back squat @ 75%", „21-15-9 thrusters @ 43 kg", „AMRAP 20: 5 pullups, 10 pushups, 15 air squats", „row 500 m @ pace 2:00"). Punkt odniesienia, gdy brak własnej historii dla danego ruchu.
2. **Historia wyników użytkownika** — wszystkie wpisane do tej pory rezultaty, zorganizowane per część sesji (Part A: 1RM = 90 kg, Part B: AMRAP 12 = 6 rund @ 50 kg, …). Każda nowa sesja powiększa ten zbiór. W MVP wszystkie wpisy historyczne ważone równo, bez heurystyk wykrywania wartości odstających. Historyczny pace cardio (np. realny czas na 500 m wiosła) działa jako sygnał wejściowy dla cross-exercise extrapolation w metrykach czasowych.
3. **Struktura bieżącej sesji** — kolejność i typ kolejnych części WOD-a (strength → conditioning → accessory). Pozycja konkretnego ćwiczenia w sesji kształtuje sugerowane obciążenie (thruster w Part C po piętnastominutowym AMRAP-ie w Part B nie jest tym samym thrusterem co świeży thruster w Part A).

**Wyjście (user-facing):**

Dla każdej części WOD-a, w widoku „dziś trenuję", konkretna sugestia w formacie dopasowanym do typu:

- Strength („find 1RM / heavy single") → sugerowane obciążenie z marginesem rozgrzewki: „spróbuj 85 kg na 1RM (ostatnio 80 kg na 5)".
- EMOM / interwał → sugerowane obciążenie + uwaga o intensywności: „45 kg na thruster, tempo 75% maxa — utrzymujesz przez 10 min".
- AMRAP / for time → sugerowane obciążenie + szacunkowy wynik: „~6 rund w 12 min".
- Edge case (brak danych) → jawne przyznanie: „za mało danych — zacznij od lekkiego obciążenia i zapisz wynik".

**Jak użytkownik to widzi w produkcie:**

Wszystko mieści się w głównym widoku „dziś trenuję" — sesja dnia, dla każdej części obok nazwy ćwiczenia widoczna sugestia, pod nią pole na wpisanie realnego wyniku. Po zapisaniu pojawia się porównanie (FR-042). Historia nie jest osobnym widokiem powracającym — działa pod spodem. Im więcej sesji w historii, tym ostrzejsze sugestie.

## Access Control

- **Logowanie:** email + hasło. Każdy użytkownik ma własne konto, własną historię, własne plany.
- **Role:** jedna płaska rola. Brak trenerów, administratorów, współdzielenia. Użytkownik widzi wyłącznie swoje dane.
- **Reset hasła:** użytkownik może zresetować hasło przez link wysłany na zarejestrowany email (FR-004). Brak weryfikacji emaila przy rejestracji w MVP (patrz Non-Goals).
- **Niezalogowany użytkownik:** żaden gated route (widok sesji, lista planów, historia, wpis wyniku) nie jest dostępny bez zalogowania; próba dostania się prowadzi do ekranu logowania / rejestracji.

## Non-Goals

MVP jawnie NIE robi poniższych rzeczy. Lista jest świadoma — każdy punkt to decyzja scope'owa, nie zapomnienie.

**Z notatek wyjściowych:**

- **Import z PDF / zdjęć / plików** — tylko czysty tekst w wklejce. Powód: parser tekstu sam w sobie jest ryzykiem MVP; dodanie OCR / wyciągania z PDF wysadza zakres.
- **Generowanie planów treningowych od zera** — aplikacja konsumuje plany, nie programuje. Powód: programowanie planów wymaga zupełnie innej domeny (periodyzacja, deload, splity) i sprzecznych celów z głównym value prop.
- **Wykresy progresu, estymacje 1RM, śledzenie makroskładników** — historia istnieje, ale nie ma wizualizacji. Powód: użytkownik konsumuje sugestie przed sesją, nie analizuje danych post-hoc; wykresy to inny use case.
- **Elementy społecznościowe** — brak udostępniania wyników, leaderboardów, friend feeds. Powód: privacy guardrail + scope'owa dyscyplina.
- **Integracje z urządzeniami** (Garmin, Apple Health, Whoop, Polar) — żadnych. Powód: każda integracja = osobny projekt; off-MVP.
- **Powiadomienia i przypomnienia** — żaden push / email reminder o sesji. Powód: dodatkowa infrastruktura bez liniowego wpływu na value prop.
- **Natywne aplikacje mobilne** (iOS / Android) — tylko responsywny web. Powód: koszt utrzymania i czas publikacji w sklepach.

**Wypłynęły w trakcie shapingu:**

- **Współdzielenie planów trener↔podopieczny** — model „jeden użytkownik widzi tylko swoje dane" stoi. Powód: relacja wielu-do-jednego wprowadza role, widoki, uprawnienia. Rozważyć w v2 jako wyraźnie wartościowe rozszerzenie.
- **Pace cardio jako osobna sugestia** (np. „wiosłuj 500 m w 2:00", „biegaj milę pace 5:30/km") — sugestie w MVP obejmują obciążenie / liczbę powtórzeń / czas. Pace cardio występuje wyłącznie jako część RX z planu (gdy autor go zadeklarował) oraz jako sygnał historyczny dla cross-exercise extrapolation (FR-030 — szacowanie liczby rund w AMRAP-ie na bazie historycznego pace'u). Powód: dodanie pace'u jako sugerowanego wymiaru rozszerza model, format wyjścia i UI bez liniowego wpływu na MVP value prop. Wraca w v2.
- **Reorder / drag-drop edycji ćwiczeń** — edycja w MVP jest prymitywna (tekstowa per pole). Powód: zaawansowany edytor odchodzi od „best effort parser + minimalna korekta" w stronę pełnoprawnego edytora planów, co podwoiłoby zakres UI.
- **Heurystyki / learning między użytkownikami** („osoby z twoim back squat 1RM robią X") — sugestie są wyłącznie per-user. Powód: wymagałoby telemetrycznego zbierania danych i agregacji; otwiera dyskusję privacy + RODO; off-MVP.
- **Ankieta startowa (cold start z 3–5 wynikami referencyjnymi)** — wycięta. Powód: wartości RX z planu treningowego stanowią naturalny punkt odniesienia bez friction onboardingu i bez ryzyka, że nowicjusz wpisze zmyślony 1RM.
- **Weryfikacja emaila przy rejestracji** — w MVP brak. Powód: kompromis MVP po godzinach. Reset hasła (FR-004) chroni przed scenariuszem „zapomniałem hasła = nowe konto"; pełna weryfikacja emaila to dodatkowy ekran, integracja z mailingiem i flow potwierdzenia — wraca w v2 razem z innymi elementami hygiene (np. rate-limiting prób logowania).
- **Obsługa sesji dla początkujących (beginners blocks)** — parser pomija jawnie oznaczone bloki „beginners:" w wklejanych planach (FR-021). Powód: persona MVP to osoba trenująca standardową klasę CrossFit wg planu trenera; początkujący w tym etapie nie potrzebują tego typu aplikacji — model i UI optymalizowane pod jeden poziom.
- **Heurystyki ważenia historii treningowej** — wszystkie wpisy historyczne ważone równo (FR-041). Powód: heurystyki (ważenie recencyjne, wykrywanie wartości odstających, ręczne flagowanie „zły dzień") wprowadzają złożoność modelu i UI bez liniowego wpływu na MVP value prop. Wraca jako temat w v2, jeśli w praktyce sugestie zaczną odjeżdżać.

## Open Questions

1. **Zewnętrzne usługi i retencja danych** — czy zawartość planów oraz wyniki użytkowników mogą być wykorzystywane do trenowania zewnętrznych modeli używanych do parsowania / sugestii, czy wymagamy zero-data-retention (opt-out)? Decyzja ma wpływ na wybór dostawców na etapie tech-stack-selection. Owner: użytkownik. Block: nie dla PRD; tak dla 10x-tech-stack-selector.
2. **Target scale poza liczbą użytkowników** — wpisany `users: small`, ale brak ballparku QPS i wolumenu danych. Czy to istotne dla MVP, czy domknięte na etapie wyboru stacku? Owner: użytkownik. Block: nie (przekazane do 10x-tech-stack-selector).
