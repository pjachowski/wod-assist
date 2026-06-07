---
project: WodAssist
version: 1
status: draft
created: 2026-06-07
updated: 2026-06-07
prd_version: 2
main_goal: speed
top_blocker: time
---

# Roadmap: WodAssist

> Derived from `context/foundation/prd.md` (v2) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

WodAssist pozwala osobie trenującej CrossFit według planu od trenera wkleić plan w czystym tekście i przy przeglądaniu dnia treningowego („dziś trenuję") zobaczyć konkretną sugestię obciążenia / liczby powtórzeń / czasu dla każdej części WOD-a. Sugestie wychodzą z wartości RX z planu i z historii realnych wyników użytkownika — nie z przeterminowanego, deklarowanego 1RM — i uwzględniają kumulowane zmęczenie w obrębie sesji. Każdy wpisany wynik zasila kolejne sugestie, więc rekomendacje ostrzą się z tygodnia na tydzień.

## North star

**S-02: użytkownik może otworzyć „dziś trenuję" i przy każdej części WOD-a zobaczyć konkretną sugestię z wartości RX planu** — najwcześniej zderza z rzeczywistością nazwany w PRD najryzykowniejszy element MVP (parser tekstu) i już daje użytkownikowi wartość, co przy celu „szybkie dowiezienie" maksymalizuje czas pilotażu przed twardym terminem 2026-07-05.

> Gwiazda przewodnia (north star) oznacza tu: najmniejszy przechodzący od początku do końca wycinek, którego udane dowiezienie udowadnia główną hipotezę produktu — umieszczony tak wcześnie, jak pozwalają jego poprzedniki, bo wszystko inne ma sens tylko wtedy, gdy ten działa.

## At a glance

| ID   | Change ID                       | Outcome (użytkownik może …)                                            | Prerequisites | PRD refs                              | Status   |
| ---- | ------------------------------- | ---------------------------------------------------------------------- | ------------- | ------------------------------------- | -------- |
| F-01 | llm-provider-contract           | (foundation) dostawca LLM wybrany i okablowany jedną ścieżką wywołania | —             | NFR „Prywatność", FR-010, FR-030      | blocked  |
| S-01 | paste-and-parse-plan            | wkleić plan i zobaczyć wykryte dni z ćwiczeniami i RX                  | F-01          | FR-003, FR-010, FR-020, FR-021, US-01 | proposed |
| S-02 | today-view-rx-suggestions       | otworzyć „dziś trenuję" z sugestią z RX przy każdej części             | S-01          | FR-023, FR-030, FR-031, US-01, US-03  | proposed |
| S-03 | edit-parsed-plan                | poprawić pojedyncze pola sparsowanego dnia                             | S-01          | FR-022, US-01                         | proposed |
| S-04 | log-session-results             | wpisać realne wyniki per część sesji jedną ręką na telefonie           | S-02          | FR-040, FR-041, US-01                 | proposed |
| S-05 | history-aware-suggestions       | dostawać sugestie łączące RX, własną historię i zmęczenie sesji        | S-04, F-01    | FR-030, FR-031, FR-041, US-02, US-03  | proposed |
| S-06 | suggestion-vs-result-feedback   | zobaczyć porównanie sugestii z realnym wynikiem                        | S-04          | FR-042, US-01, US-02                  | proposed |
| S-07 | password-reset-and-long-session | zresetować hasło i pozostać zalogowanym ≥ 30 dni                       | —             | FR-001, FR-002, FR-004                | ready    |
| S-08 | delete-account                  | trwale usunąć konto wraz ze wszystkimi danymi                          | S-01          | FR-003, NFR „Trwałe usunięcie danych" | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                   | Chain                                      | Note                                                                                    |
| ------ | ----------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| A      | Rdzeń: parsuj i sugeruj | `F-01` → `S-01` → `S-02` → `S-04` → `S-05` | Ścieżka „konieczne" pod szybkie dowiezienie; zawiera gwiazdę przewodnią S-02.           |
| B      | Korekta planu           | `S-03`                                     | Odgałęzienie strumienia A za S-01; domyka pętlę bezpieczeństwa wokół parsera.           |
| C      | Pętla zaufania          | `S-06`                                     | Odgałęzienie strumienia A za S-04; jedyny nice-to-have — wypada pierwszy przy poślizgu. |
| D      | Cykl życia konta        | `S-07` / `S-08`                            | S-07 gotowy od zaraz (zero poprzedników); S-08 dołącza do strumienia A za S-01.         |

## Baseline

What's already in place in the codebase as of `2026-06-07` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — per tech-stack.md: Astro 6 + React 19 + Tailwind 4 + shadcn/ui; szkielet w `src/`
- **Backend / API:** partial — tylko endpointy auth (`src/pages/api/auth/`); zero logiki domenowej, brak SDK do LLM w `package.json`
- **Data:** absent — klient Supabase tylko dla auth; brak migracji, tabel i typów domenowych
- **Auth:** partial — Supabase email+hasło okablowane (logowanie, rejestracja, middleware); brak resetu hasła (FR-004)
- **Deploy / infra:** present — Cloudflare Workers na produkcji, auto-deploy z CI (GitHub Actions), nagłówki bezpieczeństwa
- **Observability:** partial — natywna obserwowalność Cloudflare włączona (`wrangler.jsonc`); brak śledzenia błędów na poziomie aplikacji

## Foundations

### F-01: Kontrakt integracji LLM

- **Outcome:** (foundation) dostawca LLM wybrany zgodnie z decyzją o retencji danych; sekret dostawcy okablowany w środowiskach (lokalnym i produkcyjnym); pojedyncza ścieżka wywołania dostępna dla parsowania i sugestii; treść deklaracji prywatności wobec użytkownika ustalona.
- **Change ID:** llm-provider-contract
- **PRD refs:** NFR „Prywatność danych użytkownika", FR-010, FR-030 (jako konsumenci ścieżki wywołania)
- **Unlocks:** S-01, S-02, S-05; redukuje Otwarte pytanie nr 1 (retencja danych u dostawcy)
- **Prerequisites:** —
- **Parallel with:** S-07
- **Blockers:** —
- **Unknowns:**
  - Czy zawartość planów i wyniki mogą trenować modele dostawcy, czy wymagamy zero-data-retention? — Owner: użytkownik. Block: yes.
- **Risk:** cała ścieżka „konieczne" (S-01 → S-02 → S-04 → S-05) przechodzi przez tę ścieżkę wywołania — odkładanie decyzji o retencji wstrzymuje rdzeń produktu, a przy 4 tygodniach po godzinach każdy tydzień zwłoki zjada pilotaż.
- **Status:** blocked

## Slices

### S-01: Wklejenie i parsowanie planu

- **Outcome:** użytkownik może wkleić tekst planu (jeden dzień lub cały tydzień) i zobaczyć wykryte dni treningowe z listą ćwiczeń i wartościami RX; jawnie oznaczone bloki dla początkujących są pomijane; zapisany plan widzi wyłącznie właściciel konta.
- **Change ID:** paste-and-parse-plan
- **PRD refs:** FR-020, FR-021, FR-010, FR-003, US-01
- **Prerequisites:** F-01
- **Parallel with:** S-07
- **Blockers:** —
- **Unknowns:**
  - Jak różnorodne są formaty realnych planów trenerskich — ile odporności musi mieć parsowanie „best effort"? — Owner: użytkownik (dostarczy próbki planów). Block: no.
- **Risk:** parser tekstu to nazwany w PRD najbardziej ryzykowny element MVP — dlatego idzie pierwszy; tu powstają też pierwsze tabele domenowe z izolacją per użytkownika od razu (FR-003), żeby żaden późniejszy wycinek nie dokładał zabezpieczeń wstecznie.
- **Status:** proposed

### S-02: Widok „dziś trenuję" z sugestiami z RX

- **Outcome:** użytkownik może otworzyć główny widok „dziś trenuję" (oraz dowolny dzień tygodnia z nawigacji) i przy każdej części WOD-a zobaczyć konkretną sugestię wyprowadzoną z wartości RX planu, a gdy podstaw brak — jawny komunikat „za mało danych" zamiast wymyślonej liczby.
- **Change ID:** today-view-rx-suggestions
- **PRD refs:** FR-023, FR-030, FR-031, US-01, US-03
- **Prerequisites:** S-01
- **Parallel with:** S-03, S-07, S-08
- **Blockers:** —
- **Unknowns:**
  - Czy generowanie sugestii dla 3–4 części sesji mieści się w miękkim progu ~5 s na mobilnej sieci (NFR czasu reakcji)? — Owner: użytkownik (pomiar po wdrożeniu). Block: no.
- **Risk:** domyka gwiazdę przewodnią — od tego momentu produkt udowadnia hipotezę „wklej plan, dostań sensowną sugestię"; wygodne mobilne przeglądanie obowiązuje już tutaj (bariera ochronna PRD).
- **Status:** proposed

### S-03: Korekta sparsowanego planu

- **Outcome:** użytkownik może poprawić pojedyncze pola sparsowanego dnia (nazwa ćwiczenia, ciężar / powtórzenia / czas RX) prostym formularzem tekstowym.
- **Change ID:** edit-parsed-plan
- **PRD refs:** FR-022, US-01
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-04, S-05, S-06, S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** domyka pętlę bezpieczeństwa wokół parsera „best effort" — bez tej korekty każdy błąd parsowania zmusza do ponownego wklejania całego planu; nic od niej nie zależy, więc może iść równolegle z czymkolwiek.
- **Status:** proposed

### S-04: Zapis wyników sesji

- **Outcome:** użytkownik może wpisać realne wyniki per część sesji (1–3 pola, zgodnie ze strukturą WOD-a: pojedynczy ciężar, ciężar + rundy, liczba rund / czas) jedną ręką na telefonie w sali treningowej; wyniki lądują w historii ważone równo.
- **Change ID:** log-session-results
- **PRD refs:** FR-040, FR-041, US-01
- **Prerequisites:** S-02
- **Parallel with:** S-03, S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** mobilna bariera ochronna PRD (obsługa jedną ręką, bez wymuszonego zoomu) jest tu twardym kryterium — porażka UX na tym ekranie to wprost zdefiniowana porażka produktu; bez tego wycinka historia nie istnieje i S-05 nie ma czym się uczyć.
- **Status:** proposed

### S-05: Sugestie uczą się historii i sesji

- **Outcome:** użytkownik z historią wyników widzi sugestie łączące RX z planu, własne wyniki dla danego wzorca ruchu i kumulowane zmęczenie z wcześniejszych części sesji; ruch bez RX i bez historii nadal dostaje jawny komunikat o braku danych, a pierwszy wpisany wynik tego ruchu tworzy podstawę dla kolejnej sugestii.
- **Change ID:** history-aware-suggestions
- **PRD refs:** FR-030, FR-031, FR-041, US-02, US-03
- **Prerequisites:** S-04, F-01
- **Parallel with:** S-03, S-06, S-07, S-08
- **Blockers:** —
- **Unknowns:**
  - Czy modelowanie zmęczenia i ekstrapolacji między ćwiczeniami w prompcie wystarczy do progu 70% trafności ±20%? — Owner: użytkownik (pomiar na danych pilotażowych). Block: no.
- **Risk:** rdzeń wyróżnika produktu (historia zamiast deklarowanego 1RM + zmęczenie w sesji) i zarazem największa niewiadoma jakościowa — im wcześniej działa, tym więcej tygodni pilotażu na pomiar trafności przed 2026-07-05.
- **Status:** proposed

### S-06: Porównanie sugestii z wynikiem

- **Outcome:** użytkownik po zapisaniu sesji widzi porównanie sugestia vs realny wynik z asymetrycznym tonem — wynik powyżej sugestii jako pozytywny progres, poniżej jako neutralna informacja.
- **Change ID:** suggestion-vs-result-feedback
- **PRD refs:** FR-042, US-01, US-02
- **Prerequisites:** S-04
- **Parallel with:** S-03, S-05, S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** jedyny nice-to-have w zestawie — przy poślizgu względem terminu wypada z zakresu pierwszy; sekwencjonowany za pętlą zapisu, bo bez wyników nie ma czego porównywać.
- **Status:** proposed

### S-07: Domknięcie konta — reset hasła i długa sesja

- **Outcome:** użytkownik może odzyskać dostęp linkiem resetu hasła wysłanym na zarejestrowany email, pozostaje zalogowany ≥ 30 dni bez ponownego logowania, a flow rejestracji i logowania jest zweryfikowany od początku do końca na produkcji.
- **Change ID:** password-reset-and-long-session
- **PRD refs:** FR-004, FR-002, FR-001
- **Prerequisites:** —
- **Parallel with:** F-01, S-01, S-02, S-03, S-04, S-05, S-06, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** jedyny wycinek gotowy do planowania od zaraz — naturalne wypełnienie czasu, póki decyzja o dostawcy LLM wisi; bez resetu „zapomniałem hasła = nowe konto" zabija ciągłość historii, na której stoi cała wartość sugestii.
- **Status:** ready

### S-08: Trwałe usunięcie konta

- **Outcome:** użytkownik może z poziomu aplikacji usunąć konto wraz ze wszystkimi swoimi planami i wynikami; po potwierdzeniu dane są nieodzyskiwalne (zgodność z RODO).
- **Change ID:** delete-account
- **PRD refs:** FR-003, NFR „Trwałe usunięcie danych"
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-03, S-04, S-05, S-06, S-07
- **Blockers:** —
- **Unknowns:** —
- **Risk:** wymóg zgodności przed udostępnieniem aplikacji komukolwiek poza twórcą — pilotaż z prawdziwymi użytkownikami bez tego wycinka łamie deklarację prywatności; projektowanie tabel w S-01/S-04 z kluczem właściciela utrzymuje usunięcie kaskadowe prostym niezależnie od tego, kiedy ten wycinek wejdzie.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                       | Issue                                                   | Suggested issue title                     | Ready for `/10x-plan` | Notes                                           |
| ---------- | ------------------------------- | ------------------------------------------------------- | ----------------------------------------- | --------------------- | ----------------------------------------------- |
| F-01       | llm-provider-contract           | [#1](https://github.com/pjachowski/wod-assist/issues/1) | Wybór dostawcy LLM i kontrakt integracji  | no                    | zablokowany Otwartym pytaniem nr 1              |
| S-01       | paste-and-parse-plan            | [#2](https://github.com/pjachowski/wod-assist/issues/2) | Wklejanie i parsowanie planu treningowego | no                    | czeka na F-01                                   |
| S-02       | today-view-rx-suggestions       | [#3](https://github.com/pjachowski/wod-assist/issues/3) | Widok „dziś trenuję" z sugestiami z RX    | no                    | czeka na S-01                                   |
| S-03       | edit-parsed-plan                | [#4](https://github.com/pjachowski/wod-assist/issues/4) | Edycja pól sparsowanego planu             | no                    | czeka na S-01                                   |
| S-04       | log-session-results             | [#5](https://github.com/pjachowski/wod-assist/issues/5) | Zapis wyników sesji per część             | no                    | czeka na S-02                                   |
| S-05       | history-aware-suggestions       | [#6](https://github.com/pjachowski/wod-assist/issues/6) | Sugestie z historii i zmęczenia sesji     | no                    | czeka na S-04                                   |
| S-06       | suggestion-vs-result-feedback   | [#7](https://github.com/pjachowski/wod-assist/issues/7) | Porównanie sugestii z realnym wynikiem    | no                    | czeka na S-04; nice-to-have                     |
| S-07       | password-reset-and-long-session | [#8](https://github.com/pjachowski/wod-assist/issues/8) | Reset hasła i długa sesja logowania       | yes                   | Run `/10x-plan password-reset-and-long-session` |
| S-08       | delete-account                  | [#9](https://github.com/pjachowski/wod-assist/issues/9) | Trwałe usunięcie konta i danych (RODO)    | no                    | czeka na S-01                                   |

## Open Roadmap Questions

1. **Zewnętrzne usługi i retencja danych** — czy zawartość planów oraz wyniki użytkowników mogą być wykorzystywane do trenowania zewnętrznych modeli używanych do parsowania / sugestii, czy wymagamy zero-data-retention (opt-out)? Decyzja determinuje wybór dostawcy LLM i treść deklaracji prywatności wobec użytkownika. — Owner: użytkownik. Block: F-01 (a przez niego S-01, S-02, S-05).
2. **Target scale poza liczbą użytkowników** — wpisany `users: small`, brak ballparku zapytań na sekundę i wolumenu danych. Stack (Supabase + Cloudflare) wybrany z zapasem dla skali pilotażowej; pytanie wraca tylko, gdyby pilotaż przekroczył „small". — Owner: użytkownik. Block: żaden wycinek (informacyjne, roadmap-wide).

## Parked

- **Import z PDF / zdjęć / plików** — Why parked: PRD §Non-Goals; parser tekstu sam w sobie jest ryzykiem MVP, OCR wysadza zakres.
- **Generowanie planów treningowych od zera** — Why parked: PRD §Non-Goals; inna domena (periodyzacja, deload), sprzeczna z propozycją wartości.
- **Wykresy progresu, estymacje 1RM, śledzenie makroskładników** — Why parked: PRD §Non-Goals; użytkownik konsumuje sugestie przed sesją, nie analizuje danych po fakcie.
- **Elementy społecznościowe** — Why parked: PRD §Non-Goals; bariera prywatności + dyscyplina zakresu.
- **Integracje z urządzeniami (Garmin, Apple Health, Whoop, Polar)** — Why parked: PRD §Non-Goals; każda integracja to osobny projekt.
- **Powiadomienia i przypomnienia** — Why parked: PRD §Non-Goals; dodatkowa infrastruktura bez liniowego wpływu na wartość.
- **Natywne aplikacje mobilne** — Why parked: PRD §Non-Goals; tylko responsywny web w MVP.
- **Współdzielenie planów trener↔podopieczny** — Why parked: PRD §Non-Goals; role i uprawnienia poza MVP, kandydat na v2.
- **Pace cardio jako osobna sugestia** — Why parked: PRD §Non-Goals; występuje tylko jako RX z planu i sygnał historyczny dla ekstrapolacji (FR-030); wraca w v2.
- **Reorder / drag-drop edycji ćwiczeń** — Why parked: PRD §Non-Goals; edycja w MVP celowo prymitywna (tekstowa per pole, FR-022).
- **Heurystyki / uczenie między użytkownikami** — Why parked: PRD §Non-Goals; wymaga agregacji danych, otwiera tematy prywatności i RODO.
- **Ankieta startowa (cold start z wynikami referencyjnymi)** — Why parked: PRD §Non-Goals; RX z planu daje punkt wejścia bez tarcia w rejestracji.
- **Weryfikacja emaila przy rejestracji** — Why parked: PRD §Non-Goals; świadomy kompromis MVP, wraca w v2 razem z ograniczaniem prób logowania.
- **Obsługa bloków dla początkujących** — Why parked: PRD §Non-Goals; persona MVP trenuje standardową klasę, parser pomija bloki „beginners:" (FR-021).
- **Heurystyki ważenia historii treningowej** — Why parked: PRD §Non-Goals; wszystkie wpisy ważone równo (FR-041), wraca w v2, jeśli sugestie zaczną odjeżdżać.

## Done

(Empty on first generation. `/10x-archive` appends an entry here — and flips that item's `Status` to `done` — when a change whose `Change ID` matches the item is archived. Do NOT pre-populate.)
