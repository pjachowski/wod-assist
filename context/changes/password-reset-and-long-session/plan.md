# Reset hasła i długa sesja — Implementation Plan

## Overview

Domykamy cykl życia konta (S-07, issue [#8](https://github.com/pjachowski/wod-assist/issues/8)): użytkownik może odzyskać dostęp linkiem resetu hasła wysłanym na zarejestrowany email (FR-004), może pozostać zalogowany ≥ 30 dni przez opcję „zapamiętaj mnie" (FR-002), a cały flow rejestracji i logowania (FR-001) zostaje zweryfikowany od początku do końca na produkcji. Przy okazji dociągamy istniejące endpointy auth do konwencji projektu: walidacja zod na granicy route'ów i polskie komunikaty w całym UI auth.

## Current State Analysis

- **Reset hasła nie istnieje** — zero śladów `resetPasswordForEmail` / `verifyOtp` / `updateUser` w `src/`.
- **Wzorzec auth**: formularz React (`SignInForm` / `SignUpForm` zbudowane z `FormField`, `PasswordToggle`, `SubmitButton`, `ServerError`) → POST z `method="POST"` do `src/pages/api/auth/*.ts` → przekierowanie z `?error=<komunikat>` w adresie; strona `.astro` czyta parametr i podaje go do formularza jako `serverError`.
- **Endpointy bez zod** (`src/pages/api/auth/signin.ts:6-7`, `signup.ts:6-7`) — rzutowanie `as string` z `formData`, wbrew konwencji CLAUDE.md „validate input with zod at the route boundary".
- **`zod` nie jest bezpośrednią zależnością aplikacji** — występuje w `package-lock.json` tranzytywnie, ale `package.json` go nie deklaruje; importy aplikacyjne muszą mieć własną zależność.
- **Surowe angielskie błędy Supabase w UI** — `error.message` trafia wprost do parametru `?error=` (`signin.ts:17`); całe UI auth (strony, formularze, walidacja kliencka, dashboard) jest po angielsku, wbrew zasadzie „UI language is Polish".
- **Sesja**: `@supabase/ssr` w `src/middleware.ts:10-13` woła `getUser()` przy każdym żądaniu i automatycznie odświeża token; domyślne `DEFAULT_COOKIE_OPTIONS` biblioteki ustawiają ciasteczkom `maxAge` 400 dni (`node_modules/@supabase/ssr/dist/main/utils/constants.js:10`), a rotowane tokeny odświeżania Supabase nie mają wygaśnięcia bezwzględnego — czyli **długa sesja działa już dziś dla każdego**; pracą jest wariant krótkiej (sesyjnej) przy odznaczonym checkboxie.
- **Konfiguracja lokalnego Supabase** (`supabase/config.toml`): `site_url = "http://127.0.0.1:3000"` — **niezgodny z portem dev Astro (4321)**, linki z maili lokalnych prowadziłyby donikąd; `otp_expiry = 3600` (link resetu ważny 1 h); `enable_confirmations = false`; `minimum_password_length = 6`; brak szablonu emaila recovery.
- **Brak frameworka testowego** — weryfikacja to lint + build + testy ręczne.
- **Produkcja**: Cloudflare Workers (`wod-assist`), auto-deploy z CI; konfiguracja hostowanego Supabase (Site URL, szablony, sesje) żyje w panelu, poza repozytorium.

## Desired End State

- Na stronie logowania jest link „Nie pamiętasz hasła?" prowadzący do formularza, który po podaniu emaila zawsze pokazuje neutralne potwierdzenie („Jeśli konto istnieje, wysłaliśmy link…").
- Mail resetu przychodzi po polsku; link prowadzi przez serwerową weryfikację tokenu do formularza ustawienia nowego hasła tylko w aktywnym kontekście recovery; po zapisie użytkownik jest zalogowany i ląduje na `/dashboard` z potwierdzeniem.
- Wygasły lub zużyty link kończy się czytelnym polskim komunikatem i formularzem ponownej wysyłki — bez ślepych uliczek.
- Formularz logowania ma checkbox „Zapamiętaj mnie" (domyślnie odznaczony): zaznaczony → trwałe ciasteczka (~400 dni, sesja ≥ 30 dni spełniona z zapasem); odznaczony → ciasteczka sesyjne znikające po zamknięciu przeglądarki.
- Wszystkie endpointy auth walidują wejście zod-em, a każdy komunikat widoczny dla użytkownika (strony, formularze, błędy, mail) jest po polsku.
- Cały flow auth przeszedł ręczną listę kontrolną E2E na produkcji (sekcja Progress, faza 4).

### Key Discoveries:

- `@supabase/ssr` domyślnie nadaje ciasteczkom `maxAge` 400 dni — wariant „zapamiętaj mnie" to brak ingerencji; praca jest po stronie wariantu sesyjnego (`node_modules/@supabase/ssr/dist/main/utils/constants.js:4-11`).
- Klient działa w trybie PKCE (`createServerClient.js:33`) — dla resetu w SSR właściwy jest wzorzec własnego szablonu emaila z `{{ .TokenHash }}` i serwerowego `verifyOtp`, nie domyślny `{{ .ConfirmationURL }}`.
- Kasowanie ciasteczek w `@supabase/ssr` używa `maxAge: 0` (`cookies.js:200`) — logika zdejmowania `maxAge` dla sesyjnych ciasteczek musi to omijać, inaczej zepsuje wylogowanie.
- `?error=` w adresie niesie dziś pełny tekst błędu; przechodzimy na **kody** błędów w adresie + mapowanie kod → polski komunikat przy renderze strony (czyste adresy, zero problemów z kodowaniem).
- `supabase/config.toml:154` ma `site_url` na porcie 3000, a dev Astro działa na 4321 — do poprawki, bez tego lokalny test maili nie zadziała.

## What We're NOT Doing

- **Weryfikacja emaila przy rejestracji** — PRD §Non-Goals, świadomy kompromis MVP (wraca w v2).
- **Ograniczanie prób logowania (rate-limiting)** — PRD §Non-Goals, v2; zostają domyślne limity Supabase.
- **Własny SMTP / domena nadawcy** — zostajemy przy wbudowanym mailerze Supabase (limit kilku maili/h wystarcza dla pilotażu); decyzja z sesji planowania.
- **Zmiana hasła z poziomu ustawień konta** (zalogowany użytkownik zmienia hasło bez maila) — poza FR-004; osobny temat przy ekranie ustawień.
- **Powiadomienie mailem o zmianie hasła** — dodatkowy szablon bez wymagania w PRD.
- **Testy automatyczne E2E** — brak frameworka testowego w repo; decyzja: ręczna lista kontrolna (smoke w CI to osobna, przyszła decyzja).
- **Przebudowa stylistyki ekranów auth** — tylko tłumaczenie i nowe ekrany w istniejącym stylu.

## Implementation Approach

Cztery fazy w kolejności: najpierw fundament (zod + polskie komunikaty + mapa błędów), bo nowe endpointy resetu mają od razu powstać w docelowej konwencji; potem flow resetu (największy kawałek — 2 strony, 3 endpointy, szablon emaila); potem „zapamiętaj mnie" (zmiana przekrojowa w `supabase.ts`); na końcu konfiguracja hostowanego Supabase i ręczna weryfikacja E2E na produkcji. Faza 2 zależy od fazy 1; faza 3 zależy od fazy 2 (dopina tryb sesyjny także w `confirm.ts` z fazy 2); faza 4 zamyka całość.

Wzorzec resetu (zalecany przez Supabase dla SSR): własny szablon emaila linkuje do `GET /api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`; endpoint woła `verifyOtp`, co zapisuje sesję w ciasteczkach (auto-zalogowanie), ustawia krótkie ciasteczko intencji recovery i przekierowuje na `/auth/update-password`; tam formularz POST-uje nowe hasło do `updateUser`. Ciasteczko intencji jest wymagane przez stronę i endpoint zapisu, żeby `/auth/update-password` nie stało się ukrytą zmianą hasła dla dowolnego zalogowanego użytkownika.

## Critical Implementation Details

### Zdejmowanie maxAge a kasowanie ciasteczek

`@supabase/ssr` kasuje ciasteczka ustawiając `maxAge: 0`. Logika trybu sesyjnego („zapamiętaj mnie" odznaczone) może usuwać `maxAge`/`expires` **tylko gdy `maxAge > 0`** — zdjęcie `maxAge: 0` zamieniłoby kasowanie w ustawienie i zepsuło wylogowanie.

### Strona update-password celowo poza PROTECTED_ROUTES

CLAUDE.md każe dodawać chronione ścieżki do `PROTECTED_ROUTES` w `src/middleware.ts:4`, ale tamta lista przekierowuje na `/auth/signin`. Użytkownik z wygasłą sesją recovery albo bez intencji recovery ma trafić na `/auth/forgot-password` (komunikat + ponowna wysyłka), więc strona robi własny guard w frontmatter. Odstępstwo udokumentować komentarzem w pliku strony.

### Marker intencji recovery

`verifyOtp({ type: "recovery", token_hash })` tworzy zwykłą sesję Supabase, której nie da się później odróżnić od normalnego logowania przez samo `Astro.locals.user`. Dlatego `/api/auth/confirm` ustawia dodatkowe ciasteczko `wa-password-recovery=1` z krótkim `maxAge` (np. 15 minut), `httpOnly`, `sameSite=lax`, `path=/`. Strona `/auth/update-password` i endpoint `/api/auth/update-password` wymagają jednocześnie aktywnej sesji oraz tego markera; sukces `updateUser` usuwa marker. Brak markera ma przekierować do `/auth/forgot-password?error=otp_expired`, nawet gdy użytkownik jest zalogowany normalną sesją. Wylogowanie (`signout.ts`) również kasuje marker — wiszący marker po wylogowaniu w trakcie flow jest praktycznie nieszkodliwy (bez sesji nic nie daje), ale sprzątanie to jedna linia higieny.

### Szablon emaila musi używać TokenHash

Domyślny szablon Supabase linkuje przez `{{ .ConfirmationURL }}` (endpoint `/auth/v1/verify` Supabase). W trybie PKCE z serwerowym klientem właściwy wzorzec to `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` + `verifyOtp` po stronie aplikacji — token jest jednorazowy, więc drugi klik w ten sam link musi trafić w ścieżkę „link wygasł".

### Lokalna weryfikacja maili

`npx supabase start` wystawia lokalną skrzynkę (Mailpit/Inbucket) pod `http://127.0.0.1:54324` — tam lądują maile resetu w dev. Warunek: `site_url` w `config.toml` musi wskazywać port dev Astro (`http://localhost:4321`), inaczej linki z maili prowadzą na martwy port. Zmiany w `config.toml` wymagają restartu lokalnego stosu (`npx supabase stop && npx supabase start`).

### Marker trybu sesji

Wybór z checkboxa musi przetrwać do kolejnych odświeżeń tokenu w middleware (nawet po tygodniach), więc ląduje w osobnym ciasteczku-markerze ustawianym przy logowaniu. Marker w trybie sesyjnym sam jest ciasteczkiem sesyjnym (umiera razem z sesją przeglądarki); w trybie trwałym dostaje `maxAge` 400 dni. Brak markera = tryb trwały (zachowanie zgodne z istniejącymi sesjami sprzed zmiany).

Sesja utworzona przez `verifyOtp` (recovery) dostaje marker `"0"` (tryb sesyjny) — użytkownik nie dokonał przy niej świadomego wyboru długiej sesji, którego wymagamy przy zwykłym logowaniu; kolejne pełne logowanie odbywa się już nowym hasłem i przechodzi przez checkbox. Żeby ciasteczka sesji zapisane przez samo `verifyOtp` były sesyjne, `confirm.ts` musi utworzyć klienta przez `createClient(..., { persistSession: false })` przed wywołaniem `verifyOtp`. Krok należy do fazy 3 (tam powstaje stała i logika trybów), choć dotyka `confirm.ts` z fazy 2.

---

## Phase 1: Fundament auth po polsku

### Overview

Wszystkie istniejące endpointy auth dostają walidację zod i przechodzą na kody błędów w adresie; powstaje wspólna mapa kod → polski komunikat; całe istniejące UI auth (strony, formularze, dashboard) mówi po polsku. Nowe ekrany w fazie 2 powstają już w tej konwencji.

### Changes Required:

#### 1. Bezpośrednia zależność zod

**Files**: `package.json`, `package-lock.json`

**Intent**: Aplikacja importuje `zod` bez polegania na zależności tranzytywnej z innych paczek.

**Contract**: Dodać `zod` do `dependencies` przez `npm install zod` (albo równoważną aktualizację lockfile); nie importować `zod` z zależności pośrednich.

#### 2. Mapa błędów auth

**File**: `src/lib/auth-errors.ts` (nowy)

**Intent**: Jedno źródło polskich komunikatów dla błędów auth — endpointy przekierowują z kodem, strony tłumaczą kod na komunikat.

**Contract**: Eksport `authErrorMessage(code: string | null): string | null` — `null` dla braku kodu, polski komunikat dla znanego kodu, generyczny polski fallback („Coś poszło nie tak. Spróbuj ponownie.") dla nieznanego. Pokryte kody: `invalid_credentials`, `user_already_exists`, `email_exists`, `weak_password`, `same_password`, `over_email_send_rate_limit`, `otp_expired`, oraz własne kody aplikacji: `validation_failed` (odrzucone przez zod), `not_configured` (brak klienta Supabase).

#### 3. Endpoint logowania

**File**: `src/pages/api/auth/signin.ts`

**Intent**: Walidacja zod na granicy route'u; przekierowania z kodem błędu zamiast surowego `error.message`.

**Contract**: Schemat zod `{ email: z.string().email(), password: z.string().min(1) }` na danych z `formData`; porażka walidacji → `/auth/signin?error=validation_failed`; błąd Supabase → `/auth/signin?error=<error.code>` (z fallbackiem na `unknown`); sukces → przekierowanie na `/` bez zmian.

#### 4. Endpoint rejestracji

**File**: `src/pages/api/auth/signup.ts`

**Intent**: Jak wyżej — zod + kody błędów.

**Contract**: Schemat `{ email: z.string().email(), password: z.string().min(6) }` (zgodnie z `minimum_password_length = 6`); przekierowania analogiczne do signin; sukces → `/auth/confirm-email` bez zmian. `signout.ts` zostaje bez zod (nie przyjmuje wejścia).

#### 5. Strony auth — polskie teksty i mapowanie kodów

**Files**: `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, `src/pages/auth/confirm-email.astro`

**Intent**: Tłumaczenie wszystkich tekstów na polski; frontmatter mapuje `?error=<kod>` przez `authErrorMessage()` i podaje gotowy komunikat do formularza.

**Contract**: Prop `serverError` formularzy dostaje już przetłumaczony komunikat (kontrakt komponentów bez zmian). Tytuły (`<Layout title>`), nagłówki, linki pomocnicze („Nie masz konta? Zarejestruj się" itd.) po polsku.

#### 6. Formularze — polskie etykiety i walidacja kliencka

**Files**: `src/components/auth/SignInForm.tsx`, `src/components/auth/SignUpForm.tsx`

**Intent**: Tłumaczenie etykiet pól, tekstów przycisków (w tym `pendingText`), placeholderów i komunikatów walidacji klienckiej („Email jest wymagany", „Podaj poprawny adres email", „Hasło jest wymagane", „Hasło musi mieć co najmniej 6 znaków", „Hasła muszą być takie same", podpowiedź o brakujących znakach).

**Contract**: Bez zmian w strukturze komponentów i nazwach pól (`email`, `password`, `confirmPassword`) — wyłącznie warstwa tekstowa.

#### 7. Dashboard po polsku

**File**: `src/pages/dashboard.astro`

**Intent**: Tłumaczenie tekstów strony przykładowej („Witaj", „Ta strona jest dostępna tylko dla zalogowanych", „Wyloguj się") — wchodzi w zakres weryfikowanego E2E flow.

**Contract**: Bez zmian w logice; tylko teksty.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Build przechodzi: `npm run build`

#### Manual Verification:

- Logowanie błędnym hasłem pokazuje polski komunikat („Nieprawidłowy email lub hasło")
- Rejestracja na zajęty email pokazuje polski komunikat
- Poprawne logowanie, rejestracja i wylogowanie działają jak przed zmianą
- Wszystkie ekrany auth + dashboard są w całości po polsku (zero angielskich tekstów)

**Implementation Note**: Po ukończeniu fazy i przejściu weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie od człowieka przed przejściem do fazy 2.

---

## Phase 2: Flow resetu hasła

### Overview

Pełny flow FR-004: formularz „zapomniałem hasła" z neutralnym potwierdzeniem, polski szablon emaila, serwerowa weryfikacja tokenu z auto-zalogowaniem, formularz nowego hasła z lądowaniem na dashboardzie, obsługa wygasłego/zużytego linku.

### Changes Required:

#### 1. Strona „zapomniałem hasła"

**File**: `src/pages/auth/forgot-password.astro` (nowy)

**Intent**: Strona w stylu pozostałych ekranów auth z trzema stanami: formularz (domyślnie), neutralne potwierdzenie po wysyłce, komunikat o wygasłym linku nad formularzem.

**Contract**: `?sent=1` → zamiast formularza potwierdzenie „Jeśli konto o tym adresie istnieje, wysłaliśmy link do ustawienia nowego hasła. Sprawdź skrzynkę."; `?error=otp_expired` → komunikat „Link wygasł lub został już użyty — wyślij nowy." nad formularzem; pozostałe kody błędów przez `authErrorMessage()`. Link powrotny do `/auth/signin`.

#### 2. Formularz wysyłki linku

**File**: `src/components/auth/ForgotPasswordForm.tsx` (nowy)

**Intent**: Formularz z jednym polem email, zbudowany z istniejących `FormField` / `SubmitButton` / `ServerError`, POST na `/api/auth/forgot-password`.

**Contract**: Walidacja kliencka jak w `SignInForm` (wymagany, poprawny format); pole `name="email"`.

#### 3. Endpoint wysyłki linku

**File**: `src/pages/api/auth/forgot-password.ts` (nowy)

**Intent**: Walidacja zod, wywołanie `supabase.auth.resetPasswordForEmail(email)`, neutralna odpowiedź niezależna od istnienia konta.

**Contract**: `export const prerender = false`; sukces ORAZ błędy nieujawnialne (np. nieistniejący email — Supabase i tak zwraca sukces) → `/auth/forgot-password?sent=1`; wyjątek: `over_email_send_rate_limit` → `?error=over_email_send_rate_limit` (informacja o limicie nie zdradza istnienia konta).

#### 4. Serwerowa weryfikacja tokenu z emaila

**File**: `src/pages/api/auth/confirm.ts` (nowy)

**Intent**: Endpoint GET, na który wskazuje link z maila; weryfikuje token jednorazowy i tworzy sesję (auto-zalogowanie), po czym kieruje do formularza nowego hasła.

**Contract**: `GET /api/auth/confirm?token_hash=<hash>&type=recovery`; zod na parametrach query; `supabase.auth.verifyOtp({ type, token_hash })` — sukces → ustawia `wa-password-recovery=1` (`httpOnly`, `sameSite=lax`, `path=/`, krótki `maxAge`, np. 15 min) i przekierowuje na `/auth/update-password` (ciasteczka sesji Supabase już zapisane przez klienta SSR); dowolny błąd → `/auth/forgot-password?error=otp_expired` bez ustawiania markera. Endpoint pisany generycznie względem `type` (enum zod, na razie tylko `recovery`) — w v2 obsłuży też potwierdzenie emaila.

#### 5. Strona ustawiania nowego hasła

**File**: `src/pages/auth/update-password.astro` (nowy)

**Intent**: Strona dostępna tylko po poprawnym wejściu z linku recovery; zwykła aktywna sesja nie wystarcza, żeby nie tworzyć ukrytej zmiany hasła z poziomu zalogowanego konta.

**Contract**: Guard we frontmatter: `Astro.locals.user` puste LUB brak ciasteczka `wa-password-recovery=1` → `Astro.redirect("/auth/forgot-password?error=otp_expired")`. Celowo POZA `PROTECTED_ROUTES` (inny cel przekierowania niż `/auth/signin`) — z komentarzem wyjaśniającym odstępstwo. Mapowanie `?error=` jak na innych stronach auth.

#### 6. Formularz nowego hasła

**File**: `src/components/auth/UpdatePasswordForm.tsx` (nowy)

**Intent**: Dwa pola (nowe hasło + powtórzenie) z przełącznikami widoczności, walidacja kliencka jak w `SignUpForm` (min 6, zgodność pól), POST na `/api/auth/update-password`.

**Contract**: Pola `name="password"` i `name="confirmPassword"`; polskie etykiety i komunikaty.

#### 7. Endpoint zapisu nowego hasła

**File**: `src/pages/api/auth/update-password.ts` (nowy)

**Intent**: Walidacja zod, zapis hasła przez `supabase.auth.updateUser({ password })`, przekierowanie zalogowanego użytkownika na dashboard z potwierdzeniem.

**Contract**: Brak sesji (`getUser()` puste) LUB brak ciasteczka `wa-password-recovery=1` → `/auth/forgot-password?error=otp_expired`; zod `{ password: z.string().min(6), confirmPassword: z.string().min(6) }` + `refine(password === confirmPassword)`; błąd walidacji → `/auth/update-password?error=validation_failed`; błąd `same_password` → `/auth/update-password?error=same_password`; sukces → usunięcie `wa-password-recovery` i przekierowanie na `/dashboard?notice=password_updated`.

#### 8. Potwierdzenie na dashboardzie

**File**: `src/pages/dashboard.astro`

**Intent**: Render polskiego potwierdzenia („Hasło zostało zmienione.") gdy `?notice=password_updated`.

**Contract**: Czytanie parametru we frontmatter, warunkowy element nad treścią strony; brak nowych komponentów.

#### 9. Link „Nie pamiętasz hasła?" na logowaniu

**File**: `src/pages/auth/signin.astro`

**Intent**: Link do `/auth/forgot-password` pod formularzem logowania, w stylu istniejącego linku do rejestracji.

**Contract**: Czysto prezentacyjna zmiana strony; formularz bez zmian.

#### 10. Polski szablon emaila resetu

**Files**: `supabase/templates/recovery.html` (nowy), `supabase/config.toml`

**Intent**: Polski email resetu z linkiem w docelowym wzorcu token_hash; rejestracja szablonu i naprawa `site_url` w lokalnej konfiguracji.

**Contract**: Szablon linkuje do `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` (NIE `{{ .ConfirmationURL }}` — patrz Critical Implementation Details). W `config.toml`: sekcja `[auth.email.template.recovery]` z polskim `subject` i `content_path = "./supabase/templates/recovery.html"`; `site_url` zmieniony na `http://localhost:4321`. Wymaga restartu lokalnego stosu Supabase.

#### 11. Wylogowanie sprząta marker recovery

**File**: `src/pages/api/auth/signout.ts`

**Intent**: Wylogowanie w trakcie flow resetu nie zostawia wiszącego markera intencji recovery.

**Contract**: `cookies.delete("wa-password-recovery", { path: "/" })` po `signOut()` (nazwa markera jako stała współdzielona z `confirm.ts` i `update-password.ts`).

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Build przechodzi: `npm run build`

#### Manual Verification:

- Pełny reset lokalnie: formularz → polski mail w Mailpit (`http://127.0.0.1:54324`) → link → formularz nowego hasła → auto-zalogowanie na `/dashboard` z potwierdzeniem
- Nieistniejący email daje identyczne neutralne potwierdzenie jak istniejący
- Ponowne kliknięcie zużytego linku → komunikat „link wygasł" + formularz ponownej wysyłki
- Wejście na `/auth/update-password` bez sesji → przekierowanie na formularz resetu z komunikatem
- Wejście na `/auth/update-password` ze zwykłą zalogowaną sesją, ale bez markera recovery → przekierowanie na formularz resetu z komunikatem
- Bezpośredni POST na `/api/auth/update-password` z różnymi wartościami `password` i `confirmPassword` jest odrzucany walidacją serwerową
- Wylogowanie po kliknięciu linku recovery (przed zmianą hasła) kasuje marker `wa-password-recovery`
- Link „Nie pamiętasz hasła?" widoczny i działa na stronie logowania

**Implementation Note**: Po ukończeniu fazy i przejściu weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie od człowieka przed przejściem do fazy 3.

---

## Phase 3: „Zapamiętaj mnie"

### Overview

Checkbox w formularzu logowania (domyślnie odznaczony) steruje trwałością ciasteczek auth: zaznaczony → trwałe (~400 dni, FR-002 spełnione z zapasem); odznaczony → sesyjne, znikające po zamknięciu przeglądarki. Wybór zapisany w ciasteczku-markerze honorowany przez middleware przy każdym odświeżeniu tokenu.

### Changes Required:

#### 1. Checkbox w formularzu logowania

**File**: `src/components/auth/SignInForm.tsx`

**Intent**: Checkbox „Zapamiętaj mnie (logowanie na 30 dni)" między polem hasła a przyciskiem, domyślnie odznaczony, stylowany zgodnie z resztą formularza (natywny input — w `src/components/ui/` nie ma komponentu checkbox, a formularz to zwykły POST).

**Contract**: Pole `name="remember"`, wartość `"1"` gdy zaznaczone (nieobecne w formData gdy odznaczone — standard HTML).

#### 2. Tryb trwałości w kliencie Supabase

**File**: `src/lib/supabase.ts`

**Intent**: `createClient` rozumie dwa tryby trwałości ciasteczek; tryb wyznacza jawny parametr (endpoint logowania) albo ciasteczko-marker z żądania (middleware i wszystkie pozostałe wywołania).

**Contract**: Sygnatura `createClient(requestHeaders, cookies, options?: { persistSession?: boolean })`. Priorytet: jawne `options.persistSession` → wartość markera z nagłówka `Cookie` → domyślnie `true` (sesje sprzed zmiany zachowują się jak dotąd). W trybie `false` funkcja `setAll` usuwa `maxAge` i `expires` z opcji ciasteczka **tylko gdy `maxAge > 0`** (kasowanie przez `maxAge: 0` musi przejść nietknięte — patrz Critical Implementation Details). Nazwa markera eksportowana jako stała (np. `SESSION_PERSIST_COOKIE = "wa-session-persist"`).

#### 3. Endpoint logowania ustawia marker

**File**: `src/pages/api/auth/signin.ts`

**Intent**: Endpoint czyta pole `remember`, tworzy klienta z jawnym trybem trwałości i po udanym logowaniu zapisuje marker na kolejne żądania.

**Contract**: `remember` w schemacie zod jako pole opcjonalne; `createClient(..., { persistSession: remember })`; po sukcesie marker `wa-session-persist`: wartość `"1"` z `maxAge` 400 dni (tryb trwały) albo wartość `"0"` bez `maxAge` (ciasteczko sesyjne, tryb sesyjny); atrybuty `path=/`, `sameSite=lax`, `httpOnly`.

#### 4. Wylogowanie sprząta marker

**File**: `src/pages/api/auth/signout.ts`

**Intent**: Przy wylogowaniu marker jest usuwany razem z ciasteczkami sesji.

**Contract**: `cookies.delete(SESSION_PERSIST_COOKIE, { path: "/" })` po `signOut()`.

#### 5. Sesja recovery jako sesyjna

**File**: `src/pages/api/auth/confirm.ts`

**Intent**: Sesja utworzona przez `verifyOtp` jest sesyjna (do zamknięcia przeglądarki) — użytkownik nie dokonał świadomego wyboru długiej sesji; spójnie z domyślnie odznaczonym checkboxem przy logowaniu.

**Contract**: Endpoint tworzy klienta Supabase przez `createClient(context.request.headers, context.cookies, { persistSession: false })` **przed** wywołaniem `verifyOtp`, żeby ciasteczka sesji zapisane przez `verifyOtp` były sesyjne. Po udanym `verifyOtp`, obok markera recovery, endpoint ustawia `SESSION_PERSIST_COOKIE="0"` bez `maxAge` (ciasteczko sesyjne).

#### 6. Middleware — bez zmian kodu (kontrakt do potwierdzenia)

**File**: `src/middleware.ts`

**Intent**: Middleware honoruje tryb automatycznie, bo `createClient` czyta marker z nagłówków żądania — zmiana kodu niepotrzebna; w ramach fazy potwierdzić, że odświeżenie tokenu w trybie sesyjnym zapisuje ciasteczka bez `maxAge`.

**Contract**: Wywołanie `createClient(context.request.headers, context.cookies)` pozostaje bez trzeciego argumentu.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Build przechodzi: `npm run build`

#### Manual Verification:

- Logowanie bez checkboxa → ciasteczka auth w DevTools bez `Expires`/`Max-Age` (sesyjne), marker `wa-session-persist=0` też sesyjny
- Logowanie z checkboxem → ciasteczka auth z `Expires` ~400 dni w przód, marker `=1` trwały
- Pełny restart przeglądarki: bez checkboxa użytkownik wylogowany, z checkboxem nadal zalogowany
- Wylogowanie usuwa ciasteczka auth i marker
- Tryb sesyjny przeżywa odświeżenie tokenu: po wygaśnięciu JWT (1 h) kolejne żądanie odświeża sesję i ciasteczka pozostają sesyjne (test: skrócić `jwt_expiry` lokalnie albo zweryfikować nagłówki `Set-Cookie` przy odświeżeniu)
- Po resecie hasła sesja jest sesyjna: restart przeglądarki wymaga logowania (już nowym hasłem)

**Implementation Note**: Po ukończeniu fazy i przejściu weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie od człowieka przed przejściem do fazy 4.

---

## Phase 4: Produkcja i weryfikacja E2E

### Overview

Konfiguracja hostowanego projektu Supabase (panel — poza repozytorium), deploy przez CI i ręczna lista kontrolna całego flow auth na produkcji. Faza bez zmian w kodzie aplikacji.

### Changes Required:

#### 1. Konfiguracja hostowanego Supabase (panel)

**File**: — (panel `supabase.com/dashboard`, projekt produkcyjny)

**Intent**: Dostosowanie hostowanego projektu do nowego flow; konfiguracja żyje poza repo, więc każdy krok jest jawnie wymieniony tu i odhaczany w Progress.

**Contract**: (a) **Authentication → URL Configuration**: `Site URL` = produkcyjny adres aplikacji (Workers); `Redirect URLs` zawiera `https://<prod>/api/auth/confirm`; (b) **Authentication → Email Templates → Reset password**: polski `subject` + treść z `supabase/templates/recovery.html` (wzorzec token_hash); (c) **Authentication → Sign In / Up**: `Confirm email` wyłączone (zgodnie z PRD §Non-Goals); (d) **Authentication → Sessions**: brak `time-box` i brak limitu bezczynności (wartości domyślne — tylko potwierdzić, bez zmian); (e) wbudowany mailer i jego limity zaakceptowane świadomie (decyzja z planowania).

#### 2. Deploy

**File**: — (CI)

**Intent**: Scalenie zmian do `main` uruchamia auto-deploy z CI; bez ręcznego `wrangler deploy`.

**Contract**: Workflow `.github/workflows/ci.yml` bez zmian.

### Success Criteria:

#### Automated Verification:

- CI zielone na `main` (lint + build + deploy)
- Smoke produkcji: `curl -s -o /dev/null -w "%{http_code}" https://<prod>/auth/signin` zwraca `200`

#### Manual Verification (lista kontrolna E2E na produkcji):

- Rejestracja nowego konta testowego na prawdziwy email → logowanie działa (FR-001)
- Reset hasła od początku do końca: formularz → polski mail w prawdziwej skrzynce (sprawdzić też spam) → link prowadzi na domenę produkcyjną → nowe hasło → auto-zalogowanie na dashboard (FR-004)
- Ponowne użycie linku resetu → komunikat „link wygasł" + ponowna wysyłka
- Logowanie z „zapamiętaj mnie" → ciasteczka z `Expires` ~400 dni; powrót po ≥ 48 h bez logowania nadal zalogowany (pełne 30 dni — obserwacja ciągła w pilotażu) (FR-002)
- Logowanie bez „zapamiętaj mnie" → po zamknięciu i ponownym otwarciu przeglądarki wymagane logowanie
- Wylogowanie działa i czyści sesję

**Implementation Note**: Punkt „powrót po ≥ 48 h" z natury wymaga odstępu czasowego — odhaczyć po faktycznym powrocie, nie w dniu wdrożenia. Pełna 30-dniowa obserwacja biegnie w pilotażu i nie blokuje zamknięcia zmiany.

---

## Testing Strategy

### Unit Tests:

- Brak — projekt nie ma frameworka testowego (CLAUDE.md); nie wprowadzamy go w tej zmianie.

### Integration Tests:

- Brak automatycznych — pokrycie przez ręczne listy kontrolne per faza (powyżej) i listę E2E fazy 4.

### Manual Testing Steps:

1. Lokalnie (fazy 1–3): `npx supabase start` + `npm run dev`; maile w Mailpit `http://127.0.0.1:54324`.
2. Przejść kryteria ręczne każdej fazy przed commitem fazy.
3. Przypadki brzegowe: zużyty link (drugi klik), wygasły link (>1 h — lokalnie można skrócić `otp_expiry`), `update-password` bez sesji, `update-password` ze zwykłą sesją bez markera recovery, niezgodne `password`/`confirmPassword` wysłane bezpośrednio do endpointu, email z literówką (neutralne potwierdzenie), dwa szybkie żądania resetu (limit wysyłek → polski komunikat).
4. Produkcja (faza 4): pełna lista kontrolna z sekcji Progress.

## Performance Considerations

Bez wpływu: middleware już woła `getUser()` przy każdym żądaniu; dochodzi tylko odczyt jednego ciasteczka-markera z nagłówka. Wysyłka maili jest po stronie Supabase.

## Migration Notes

Istniejące sesje nie mają ciasteczka-markera — domyślny tryb trwały (`persistSession: true` przy braku markera) zachowuje ich dotychczasowe zachowanie (trwałe ciasteczka 400 dni). Żadnych zmian w danych; brak tabel i migracji SQL w tej zmianie.

## References

- Roadmapa: `context/foundation/roadmap.md` (S-07), issue [#8](https://github.com/pjachowski/wod-assist/issues/8)
- PRD: `context/foundation/prd.md` — FR-001, FR-002, FR-004, §Non-Goals (weryfikacja emaila, rate-limiting)
- Wzorzec endpointu auth: `src/pages/api/auth/signin.ts`
- Wzorzec formularza auth: `src/components/auth/SignInForm.tsx`, `src/components/auth/FormField.tsx`
- Klient SSR i ciasteczka: `src/lib/supabase.ts`, `node_modules/@supabase/ssr/dist/main/utils/constants.js:4-11`
- Konfiguracja lokalna: `supabase/config.toml` (sekcja `[auth]`)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Fundament auth po polsku

#### Automated

- [x] 1.1 Lint przechodzi: `npm run lint` — d595dc6
- [x] 1.2 Build przechodzi: `npm run build` — d595dc6

#### Manual

- [x] 1.3 Logowanie błędnym hasłem pokazuje polski komunikat — d595dc6
- [x] 1.4 Rejestracja na zajęty email pokazuje polski komunikat — d595dc6
- [x] 1.5 Poprawne logowanie, rejestracja i wylogowanie działają jak przed zmianą — d595dc6
- [x] 1.6 Wszystkie ekrany auth + dashboard w całości po polsku — d595dc6

### Phase 2: Flow resetu hasła

#### Automated

- [x] 2.1 Lint przechodzi: `npm run lint` — 364b4df
- [x] 2.2 Build przechodzi: `npm run build` — 364b4df

#### Manual

- [x] 2.3 Pełny reset lokalnie: formularz → polski mail w Mailpit → link → nowe hasło → auto-zalogowanie na /dashboard z potwierdzeniem — 364b4df
- [x] 2.4 Nieistniejący email daje identyczne neutralne potwierdzenie — 364b4df
- [x] 2.5 Zużyty link → komunikat „link wygasł" + formularz ponownej wysyłki — 364b4df
- [x] 2.6 /auth/update-password bez sesji → przekierowanie na formularz resetu — 364b4df
- [x] 2.7 /auth/update-password ze zwykłą sesją bez markera recovery → przekierowanie na formularz resetu — 364b4df
- [x] 2.8 Bezpośredni POST z różnymi password/confirmPassword odrzucany przez serwer — 364b4df
- [x] 2.9 Wylogowanie po kliknięciu linku recovery kasuje marker wa-password-recovery — 364b4df
- [x] 2.10 Link „Nie pamiętasz hasła?" widoczny i działa na stronie logowania — 364b4df

### Phase 3: „Zapamiętaj mnie"

#### Automated

- [x] 3.1 Lint przechodzi: `npm run lint`
- [x] 3.2 Build przechodzi: `npm run build`

#### Manual

- [x] 3.3 Logowanie bez checkboxa → ciasteczka sesyjne (bez Expires/Max-Age), marker sesyjny
- [x] 3.4 Logowanie z checkboxem → ciasteczka z Expires ~400 dni, marker trwały
- [x] 3.5 Restart przeglądarki: bez checkboxa wylogowany, z checkboxem zalogowany
- [x] 3.6 Wylogowanie usuwa ciasteczka auth i marker
- [x] 3.7 Tryb sesyjny przeżywa odświeżenie tokenu (ciasteczka pozostają sesyjne)
- [x] 3.8 Po resecie hasła sesja jest sesyjna (restart przeglądarki wymaga logowania nowym hasłem)

### Phase 4: Produkcja i weryfikacja E2E

#### Automated

- [ ] 4.1 CI zielone na `main` (lint + build + deploy)
- [ ] 4.2 Smoke produkcji: `/auth/signin` zwraca 200

#### Manual

- [ ] 4.3 Panel Supabase: Site URL + Redirect URLs ustawione na adres produkcyjny
- [ ] 4.4 Panel Supabase: polski szablon „Reset password" (wzorzec token_hash)
- [ ] 4.5 Panel Supabase: Confirm email wyłączone; Sessions bez time-box i limitu bezczynności (potwierdzone)
- [ ] 4.6 Rejestracja konta testowego na prawdziwy email → logowanie działa (FR-001)
- [ ] 4.7 Pełny reset hasła na produkcji: mail po polsku, link na domenę produkcyjną, nowe hasło, dashboard (FR-004)
- [ ] 4.8 Ponowne użycie linku → komunikat „link wygasł" + ponowna wysyłka
- [ ] 4.9 „Zapamiętaj mnie": ciasteczka ~400 dni; powrót po ≥ 48 h bez logowania (FR-002)
- [ ] 4.10 Bez „zapamiętaj mnie": po restarcie przeglądarki wymagane logowanie
- [ ] 4.11 Wylogowanie działa i czyści sesję
