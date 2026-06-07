# Reset hasła i długa sesja — Plan Brief

> Full plan: `context/changes/password-reset-and-long-session/plan.md`

## What & Why

Domykamy cykl życia konta (S-07 / issue #8): reset hasła linkiem na email (FR-004), opcjonalna długa sesja ≥ 30 dni przez „zapamiętaj mnie" (FR-002) i weryfikacja całego flow auth od początku do końca na produkcji (FR-001). Bez resetu „zapomniałem hasła = nowe konto" zabija ciągłość historii treningowej, na której stoi cała wartość sugestii — a logowanie co WOD to tarcie zabijające realne użycie.

## Starting Point

Supabase auth jest okablowane (logowanie, rejestracja, middleware, wylogowanie), ale resetu hasła nie ma wcale; endpointy auth nie walidują wejścia zod-em, `zod` nie jest bezpośrednią zależnością aplikacji, a całe UI auth mówi po angielsku wbrew konwencji projektu. Długa sesja technicznie już działa (ciasteczka `@supabase/ssr` z maxAge 400 dni + auto-odświeżanie tokenu w middleware) — praca jest w wariancie krótkiej sesji i w świadomej weryfikacji.

## Desired End State

Użytkownik klika „Nie pamiętasz hasła?", dostaje polskiego maila, ustawia nowe hasło w aktywnym kontekście recovery i ląduje zalogowany na dashboardzie; wygasły link albo zwykła zalogowana sesja bez recovery kończy się komunikatem i ponowną wysyłką, nie ukrytą zmianą hasła. Przy logowaniu decyduje checkboxem, czy sesja przeżyje zamknięcie przeglądarki (zaznaczony = ~400 dni). Całość przetestowana ręcznie na produkcji.

## Key Decisions Made

| Decision               | Choice                                                        | Why (1 sentence)                                                                                           |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Zakres endpointów      | Nowe + dociągnięcie istniejących (zod + polskie komunikaty)   | Roadmapa wymaga weryfikacji całego flow auth — naturalny moment na spłatę długu konwencji.                 |
| Nieistniejący email    | Zawsze neutralne potwierdzenie                                | Standard bezpieczeństwa (brak enumeracji kont); Supabase i tak nie ujawnia istnienia konta.                |
| Wygasły/zużyty link    | Komunikat + formularz ponownej wysyłki                        | Użytkownik ratuje się sam — kluczowe w projekcie po godzinach bez wsparcia.                                |
| Dostęp do nowego hasła | Krótki marker recovery wymagany poza sesją Supabase           | `verifyOtp` tworzy zwykłą sesję; marker blokuje ukrytą zmianę hasła dla dowolnie zalogowanego użytkownika. |
| Sesja po resecie       | Sesyjna (do zamknięcia przeglądarki); signout sprząta markery | Długa sesja wymaga świadomego wyboru checkboxem — reset go nie zastępuje.                                  |
| Długa sesja            | Checkbox „zapamiętaj mnie", domyślnie odznaczony              | Świadomy wybór użytkownika; bez zaznaczenia ciasteczka sesyjne (do zamknięcia przeglądarki).               |
| Po udanym resecie      | Auto-zalogowanie i przekierowanie na dashboard                | Supabase i tak tworzy sesję przy weryfikacji tokenu — zero dodatkowego tarcia.                             |
| Wysyłka maila          | Wbudowany mailer Supabase + polski szablon (token_hash)       | Zero nowych usług; limit kilku maili/h wystarcza dla pilotażu; UI po polsku obejmuje też email.            |
| Weryfikacja            | Ręczna lista kontrolna E2E na produkcji                       | Brak frameworka testowego w repo; 30-dniową sesję i tak weryfikuje tylko czas.                             |

## Scope

**In scope:** flow resetu hasła (2 strony, 3 endpointy, krótki marker intencji recovery, polski szablon emaila), checkbox „zapamiętaj mnie" z trybem sesyjnym ciasteczek, bezpośrednia zależność `zod` + walidacja zod + polskie komunikaty we wszystkich endpointach i ekranach auth (w tym dashboard), konfiguracja hostowanego Supabase, ręczna weryfikacja E2E na produkcji.

**Out of scope:** weryfikacja emaila przy rejestracji, rate-limiting logowania, własny SMTP, zmiana hasła z ustawień konta, mail powiadomienia o zmianie hasła, testy automatyczne, przebudowa stylistyki ekranów auth.

## Architecture / Approach

Wzorzec resetu zalecany przez Supabase dla SSR: polski szablon emaila linkuje do `GET /api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` → `confirm.ts` tworzy klienta z `persistSession: false` przed `verifyOtp` → serwerowe `verifyOtp` tworzy sesję sesyjną (auto-zalogowanie) i krótki marker `wa-password-recovery=1` → `/auth/update-password` wymaga sesji oraz markera → endpoint waliduje `password` i `confirmPassword` po stronie serwera → `updateUser({ password })` → usuwa marker → dashboard. „Zapamiętaj mnie": ciasteczko-marker ustawiane przy logowaniu; `createClient` w `src/lib/supabase.ts` czyta marker i w trybie sesyjnym zdejmuje `maxAge` z ciasteczek auth (z wyjątkiem kasujących `maxAge: 0`), więc middleware honoruje wybór przy każdym odświeżeniu tokenu bez zmian w swoim kodzie.

## Phases at a Glance

| Phase                          | What it delivers                                                         | Key risk                                                                          |
| ------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1. Fundament auth po polsku    | zależność zod + mapa błędów + polskie UI w istniejącym auth              | Regresja działającego logowania/rejestracji — re-weryfikacja ręczna w kryteriach  |
| 2. Flow resetu hasła           | Pełny reset: formularz → mail → marker recovery → nowe hasło → dashboard | Marker recovery musi zawężać dostęp; bez niego URL stałby się ukrytą zmianą hasła |
| 3. „Zapamiętaj mnie"           | Checkbox + tryb sesyjny/trwały ciasteczek                                | Zdjęcie `maxAge: 0` psuje wylogowanie; tryb musi przeżyć odświeżenie tokenu       |
| 4. Produkcja i weryfikacja E2E | Konfiguracja panelu Supabase + lista kontrolna na produkcji              | Konfiguracja poza repo — łatwo pominąć krok (stąd jawna checklista)               |

**Prerequisites:** Docker (lokalny stos Supabase), dostęp do panelu hostowanego projektu Supabase, prawdziwa skrzynka email do testu produkcyjnego.
**Estimated effort:** ~3–4 sesje; fazy sekwencyjne (3 dopina tryb sesyjny także w `confirm.ts` z fazy 2); punkt „powrót po ≥ 48 h" w fazie 4 wymaga odstępu czasowego.

## Open Risks & Assumptions

- Założenie: hostowany projekt Supabase ma domyślne ustawienia sesji (brak time-box / limitu bezczynności) — faza 4 to jawnie potwierdza; gdyby było inaczej, FR-002 wymaga korekty w panelu.
- Maile z wbudowanego mailera (domena supabase.co) mogą trafiać do spamu — akceptowane dla pilotażu, lista kontrolna każe sprawdzić folder spam.
- Limit wysyłek wbudowanego mailera (kilka maili/h) — wystarczający dla pilotażu, ale test produkcyjny trzeba robić z głową (bez wielokrotnych szybkich resetów).
- Marker recovery jest dodatkowym kontraktem bezpieczeństwa — musi być `httpOnly`, krótko ważny i usuwany po udanym `updateUser`, a zwykła zalogowana sesja bez markera ma zostać odrzucona.
- Pełna weryfikacja „≥ 30 dni" jest z natury obserwacyjna — zamknięcie zmiany opiera się na poprawnych atrybutach ciasteczek + powrocie po ≥ 48 h; reszta biegnie w pilotażu.

## Success Criteria (Summary)

- Użytkownik samodzielnie odzyskuje dostęp do konta mailem resetu — łącznie ze ścieżką wygasłego linku i blokadą zwykłej sesji bez markera recovery — bez kontaktu z twórcą.
- Logowanie z „zapamiętaj mnie" przeżywa restart przeglądarki i tygodnie bez logowania; bez — kończy się z sesją przeglądarki.
- Cała lista kontrolna E2E fazy 4 odhaczona na produkcji, wszystkie teksty (UI + mail) po polsku.
