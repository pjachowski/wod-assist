---
change_id: password-reset-and-long-session
title: Password reset and long session
status: implementing
created: 2026-06-07
updated: 2026-06-07
archived_at: null
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

- 2026-06-07 (faza 4): odstępstwo od kontraktu 4.5 — potwierdzenia e-mail na produkcji ZOSTAJĄ włączone (decyzja użytkownika z 2026-06-06 podtrzymana przy wdrożeniu; plan zakładał wyłączenie zgodnie z PRD §Non-Goals). Tytuł wiersza 4.5 w Progress pozostał niezmieniony zgodnie z kontraktem formatu.
- 2026-06-07 (faza 4): trwałe ciasteczka auth skrócone z ~400 do **90 dni** (ruchome okno; commit 413553b) — decyzja użytkownika przy wdrożeniu. Tytuły wierszy 3.4 i 4.9 w Progress mówią „~400 dni" i pozostały niezmienione; faktyczna wartość to 90 dni, FR-002 (≥ 30 dni) nadal spełnione.
- 2026-06-07 (faza 4): wiersz 4.9 celowo otwarty — część „powrót po ≥ 48 h bez logowania" odhaczamy po faktycznym powrocie (nota w planie); pozostałe testy E2E na produkcji przeszły.
