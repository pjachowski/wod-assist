---
change_id: password-reset-and-long-session
title: Password reset and long session
status: impl_reviewed
created: 2026-06-07
updated: 2026-06-08
archived_at: null
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

- 2026-06-07 (faza 4): odstępstwo od kontraktu 4.5 — potwierdzenia e-mail na produkcji ZOSTAJĄ włączone (decyzja użytkownika z 2026-06-06 podtrzymana przy wdrożeniu; plan zakładał wyłączenie zgodnie z PRD §Non-Goals). Tytuł wiersza 4.5 w Progress pozostał niezmieniony zgodnie z kontraktem formatu.
- 2026-06-07 (faza 4): trwałe ciasteczka auth skrócone z ~400 do **90 dni** (ruchome okno; commit 413553b) — decyzja użytkownika przy wdrożeniu. Tytuły wierszy 3.4 i 4.9 w Progress mówią „~400 dni" i pozostały niezmienione; faktyczna wartość to 90 dni, FR-002 (≥ 30 dni) nadal spełnione.
- 2026-06-07 (faza 4): wiersz 4.9 celowo otwarty — część „powrót po ≥ 48 h bez logowania" odhaczamy po faktycznym powrocie (nota w planie); pozostałe testy E2E na produkcji przeszły.
- 2026-06-07 (epilog): 4.9 odhaczony tego samego dnia decyzją użytkownika, BEZ odczekania ≥ 48 h — kontrola Expires ~90 dni w DevTools przeszła, a obserwacja przeżywalności sesji po przerwie biegnie dalej w pilotażu (zgodnie z notą planu nie blokuje zamknięcia). Wiersz pozostaje bez SHA (flip po commicie fazy; epilog nie zapisuje własnego SHA).
- 2026-06-08 (przegląd implementacji): zmiana poza kontraktem planu — w `eslint.config.js` wyłączono regułę `@typescript-eslint/no-misused-promises` dla wszystkich plików `.astro`. Powód: reguła wywala się na poprawnym top-level `return` we frontmatterze Astro ("Expected node to have a parent"), który wszedł wraz z `update-password.astro` (faza 2). Lint przechodzi; nie było tego w „Changes Required", więc notujemy świadomie, żeby przyszły przegląd nie traktował tego jako niewyjaśnionego rozjazdu zakresu. Pełny raport: `reviews/impl-review.md`.
- 2026-06-08 (przegląd implementacji): otwarty wniosek F1 — po udanym logowaniu `signin.ts` przekierowuje na `/`, gdzie `Welcome.astro` i `Topbar.astro` mają jeszcze angielskie teksty (osłabia kryterium fazy 1 „zero angielskich tekstów" w przepływie auth). Rozwiązanie: udane logowanie przekierowuje teraz na `/dashboard` zamiast `/` (`signin.ts:57`), więc pierwszy ekran po zalogowaniu jest po polsku; angielski starter `/` zostaje poza przepływem produktu. Szczegóły w `reviews/impl-review.md`.
