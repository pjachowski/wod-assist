<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Reset hasła i długa sesja

- **Plan**: context/changes/password-reset-and-long-session/plan.md
- **Scope**: All 4 phases (full plan)
- **Date**: 2026-06-08
- **Verdict**: APPROVED (F1 fixed during triage; F2/F3 reclassified to observations)
- **Findings**: 0 critical, 1 warning (resolved), 5 observations

## Summary

The implementation faithfully matches the plan contract across all three code phases
(Phase 4 is panel config + E2E, no code). The two highest-risk areas were checked and
confirmed correct:

- **`src/lib/supabase.ts` `setAll`** — strips `maxAge`/`expires` ONLY when `maxAge > 0`,
  so logout (`maxAge: 0`) still deletes cookies, and only positive-lifetime cookies get
  the 90-day / session-scoped treatment. Correct.
- **`update-password` guard** — requires a server-validated session (`getUser()`) AND the
  `httpOnly` recovery marker (15-min TTL), enforced in both the page frontmatter and the
  endpoint. Not bypassable by a normally logged-in user.

Documented deviation verified: persistent cookies are 90 days
(`PERSIST_COOKIE_MAX_AGE`, `supabase.ts:26`), per change.md, not the plan's ~400.

No critical issues. F1 (English starter UI after a Polish sign-in) was fixed during
triage — sign-in now redirects to `/dashboard` instead of `/`. The remaining findings
are low-impact and were consciously accepted or documented, so the change is APPROVED.

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | WARNING |
| Safety & Quality    | PASS    |
| Architecture        | PASS    |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

> **Scope Discipline** is WARNING only because two changes landed outside the plan's
> "Changes Required" — both now resolved: **F4** (eslint.config.js rule disable) is
> documented in change.md, and **F5** (PasswordToggle Polish aria-labels) is accepted as
> in-scope with the Polish-UI rule. No unexplained scope drift remains.

## Success Criteria

- **1.1 / 2.1 / 3.1 — Lint** (`npm run lint`): PASS (only `astro-eslint-parser projectService` parser notices, no errors).
- **1.2 / 2.2 / 3.2 — Build** (`npm run build`): PASS (Cloudflare adapter build completes; the `[file:line]` CSS-minify warning is unrelated to this change).
- **4.1 — CI green on `main`**: marked done (db679df).
- **4.2 — Prod smoke `/auth/signin` → 200**: marked done (db679df).
- Manual criteria 1.x–4.x: all checked in Progress. See F6 for the 4.9 note.

## Findings

### F1 — Successful sign-in lands on English starter UI ✅ RESOLVED

- **Severity**: ⚠️ WARNING (resolved — see Decision)
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/Welcome.astro:35, src/components/Topbar.astro:14; redirect at src/pages/api/auth/signin.ts:57
- **Detail**: The auth pages, forms, and dashboard are Polish, but a successful sign-in
  redirects to `/`, where `Welcome.astro` ("10x Astro Starter", "Sign In", "Sign Up",
  feature cards) and `Topbar.astro` ("Sign out", "Dashboard", "Not signed in") remain
  English. This weakens the Phase 1 manual criterion of "zero angielskich tekstów" in the
  auth flow — the first screen after authenticating is English starter content.
- **Fix A ⭐ Recommended**: Redirect successful sign-in to `/dashboard` (the Polish protected screen) instead of `/`.
  - Strength: One-line change at signin.ts:57; keeps the English starter `/` page out of the authenticated product flow entirely. Aligns the landing with the dashboard the rest of the flow already uses.
  - Tradeoff: `/` starter page stays English (acceptable if it's pre-product scaffolding), and any product intent for `/` as a logged-in home would need revisiting.
  - Confidence: HIGH — `/dashboard` exists, is Polish, and is the established post-auth destination (e.g. password reset lands there).
  - Blind spot: Whether `/` is meant to become the real authenticated home later.
- **Fix B**: Translate the auth-facing UI on `/` (`Welcome.astro`, `Topbar.astro`) to Polish.
  - Strength: Makes `/` itself consistent regardless of where sign-in lands.
  - Tradeoff: Translates starter/marketing scaffolding that may be replaced wholesale by real product content; larger surface than Fix A.
  - Confidence: MEDIUM — depends on whether the starter landing survives into the product.
  - Blind spot: Other English strings elsewhere on `/` (feature cards) would also need handling.
- **Decision**: FIXED via Fix A — sign-in now redirects to `/dashboard` (signin.ts:57).

### F2 — otp_expired rendered in-form, not as a separate above-form state

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/pages/auth/forgot-password.astro:26-31
- **Detail**: Plan §Phase 2.1 specified three states with the "link expired" message ABOVE
  the form. Implementation folds `otp_expired` into the in-form `<ServerError>`
  (`serverError={error}`). `authErrorMessage` still translates it to "Link wygasł lub
  został już użyty — wyślij nowy." and the resend form is shown right below, so the UX
  outcome — clear message plus an immediate resend path — is exactly what the plan
  intended. The deviation is purely presentational (error slot vs. standalone block).
- **Fix**: None needed. Reclassified from WARNING to OBSERVATION on review — functionally
  equivalent, cosmetic only.
- **Decision**: ACCEPTED — cosmetic deviation, no functional gap; downgraded to observation.

### F3 — Reset link is coupled to the Supabase Site URL (by design)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (Reliability)
- **Location**: src/pages/api/auth/forgot-password.ts:23
- **Detail**: The reset link is built by `recovery.html` via
  `{{ .SiteURL }}/api/auth/confirm?token_hash=...`, so a correct link depends on the
  Supabase dashboard's Site URL matching the prod origin. Verified working on prod
  (Progress 4.7). **Correction to the original write-up:** passing a `redirectTo` to
  `resetPasswordForEmail` would NOT change this — Supabase only injects `redirectTo` into
  `{{ .ConfirmationURL }}`/`{{ .RedirectTo }}`, which this template deliberately does not
  use. The Site-URL coupling is inherent to the SSR token_hash pattern the plan chose, and
  omitting `redirectTo` is the safer choice (it avoids the open-redirect surface a
  user-influenced `redirectTo` can introduce). The only residual risk is operational —
  changing the dashboard Site URL breaks reset links — which is true of any externally
  configured value (Supabase URL/key, prod domain) and has no meaningful in-code guard.
- **Fix**: None in code. Reclassified from WARNING to OBSERVATION — this is correct,
  intentional, and the safer design. Site-URL changes belong in operational runbooks, not
  application code.
- **Decision**: ACCEPTED — correct by design; downgraded to observation and wording corrected.

### F4 — eslint.config.js changed outside the plan

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: eslint.config.js (astroConfig block, +3 lines)
- **Detail**: Phase 2 disabled `@typescript-eslint/no-misused-promises` for all `.astro`
  files. The rule crashes on Astro's valid top-level `return` in frontmatter
  ("Expected node to have a parent") — introduced when `update-password.astro` added a
  top-level `return Astro.redirect(...)`. The commit message explains it and lint passes,
  but the file was not listed in the plan's Changes Required, so a future review could read
  it as unexplained scope drift.
- **Fix**: Add a short plan/change note for this unplanned lint-config change.
- **Decision**: DOCUMENTED — note added to change.md (2026-06-08 review note).

### F5 — PasswordToggle aria-labels translated outside the plan

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/auth/PasswordToggle.tsx (+1 line)
- **Detail**: aria-labels translated EN→PL ("Ukryj hasło" / "Pokaż hasło"). The component is
  reused by the new password forms; the Polish translation fits the Phase 1 Polish-UI rule
  even though the file wasn't named in a contract.
- **Fix**: Accept — in-spirit with the Polish-UI rule.
- **Decision**: ACCEPTED — in-scope with the Polish-UI rule.

### F6 — Progress 4.9 checked without the planned ≥48h wait

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: plan.md:503 (Progress 4.9)
- **Detail**: Plan §Phase 4 Implementation Note required checking "powrót po ≥ 48 h" only
  after an actual return. The epilogue in change.md documents that 4.9 was checked the same
  day (DevTools Expires ~90d verified) with the ≥48h survival observation continuing in the
  pilot. Consciously documented, not silent.
- **Fix**: Accept — documented in change.md; survivability observation ongoing in the pilot.
- **Decision**: ACCEPTED — documented in change.md.
