# Cloudflare Workers Deployment Plan — WodAssist

## Context

WodAssist is an Astro 6 SSR app with Supabase Auth, deployed to **Cloudflare Workers** (Workers Static Assets) via the `@astrojs/cloudflare` v13 adapter. The infrastructure research (`context/foundation/infrastructure.md`) recommended Cloudflare; the concrete surface is **Workers**, not Pages — Cloudflare's recommended platform for new SSR projects (Pages is in maintenance mode).

**Production URL:** `https://wod-assist.patryk-jachowski.workers.dev`

> **Pages vs Workers — why Workers.** `@astrojs/cloudflare` v12+ defaults its build target to Workers Static Assets, and `wrangler.jsonc` is a Workers config (`"main": "@astrojs/cloudflare/entrypoints/server"` + `"assets"` binding). `wrangler deploy` therefore produces a Worker, not a Pages deployment. All commands below use the Workers product. **Do NOT use `wrangler pages deploy` / `wrangler pages secret` — wrong product for this build.**

---

## Current State (verified 2026-06-02)

- ✅ **Worker is live** at `wod-assist.patryk-jachowski.workers.dev` — root returns 200, `/dashboard` returns 302 (middleware auth redirect works), `/auth/signin` returns 200.
- ✅ **Secrets are set** on the Worker — `SUPABASE_URL` and `SUPABASE_KEY` both present (`wrangler secret list`).
- ✅ **Auth works on the live build** — a form POST to `/api/auth/signin` with bad credentials redirects to `?error=Invalid login credentials` (the message comes from Supabase), proving the runtime Supabase client is wired and secrets reach the Worker.
- ✅ **No config-warning banner on the live site** — the homepage HTML contains no banner div. Secrets resolve correctly at runtime; `missingConfigs` is empty. (An earlier "warning present" reading was a false positive from a `grep | head` shell pipeline masking grep's exit code — there was never a banner.)
- ℹ️ **Production was healthy all along.** No outage, no broken auth, no banner. The only stale thing in the deployed build (`2ac411a`) is the `site:` value baked into the sitemap (`pages.dev`); see Phase 4.
- ❌ **A stale, broken Pages project `wod-assist` also exists** (`wod-assist.pages.dev` → 404). It never served a functional build and must be deleted to avoid confusion.
- ⏳ **Phase-1 pre-flight fixes are done but uncommitted** in the working tree.

### Note: the `config-status.ts` refactor is defensive, not a bug fix

There is **no live config-warning bug**. Both env-reading files resolve secrets correctly at runtime on Cloudflare:

- `src/lib/supabase.ts` reads them inside the request handler → auth works.
- Even the old module-level `src/lib/config-status.ts` (`export const missingConfigs = ...`) evaluates at **isolate startup at runtime**, where `astro:env/server` secrets are in scope — so `missingConfigs` is correctly empty and no banner renders. (The earlier "build-time freeze" theory was wrong; module eval in a Worker is a runtime event, not a build event.)

The working-tree refactor to `getMissingConfigs()` (per-request evaluation) is a reasonable defensive change but fixes no observed defect:

```ts
// OLD — module-eval (still runtime in a Worker):
export const missingConfigs = configStatuses.filter((s) => !s.configured);
// NEW (uncommitted) — per request:
export function getMissingConfigs(): ConfigStatus[] {
  return getConfigStatuses().filter((s) => !s.configured);
}
```

---

## Phase 1: Pre-flight Fixes _(agent-automated — DONE, uncommitted)_

- [x] **1.1** Rename project in `thuwrangler.jsonc` → `"name": "wod-assist"`
- [x] **1.2** Rename project in `package.json` → `"name": "wod-assist"`
- [x] **1.3** Fix CI branch `master` → `main` in `.github/workflows/ci.yml`
- [x] **1.4** Add `site` to `astro.config.mjs` — set to `https://wod-assist.patryk-jachowski.workers.dev` (the Worker URL, not pages.dev) so the sitemap generates correct absolute URLs
- [x] **1.5** `config-status.ts` build-time → request-time refactor (`getConfigStatuses()` / `getMissingConfigs()`) + `Layout.astro` updated to call them — fixes the false config warning on Cloudflare runtime
- [ ] **1.6** `npx astro sync && npm run build` — verify the build succeeds without env vars (they're `optional: true`)
- [ ] **1.7** Check bundle size — inspect `dist/_worker.js` to confirm it fits the **3 MiB free-tier limit** (10 MiB on paid)
- [ ] **1.8** Commit the Phase-1 changes (currently all uncommitted — CI and redeploy need them on `main`)

**Files:** `wrangler.jsonc`, `package.json`, `.github/workflows/ci.yml`, `astro.config.mjs`, `src/lib/config-status.ts`, `src/layouts/Layout.astro`

---

## Phase 2: Cloudflare Account Setup _(user-interactive — DONE)_

- [x] **2.1** `npx wrangler login` — authenticated as `patryk.jachowski@gmail.com`
- [x] **2.2** `npx wrangler whoami` — Account ID `c124df48fe17c4074079c356b4d4080a`
- [x] **2.3** Worker `wod-assist` exists (created via `wrangler deploy`, no explicit `project create` step needed for Workers)

---

## Phase 3: Secrets & External Integrations _(user-interactive)_

- [x] **3.1** Worker secrets set — `SUPABASE_URL` and `SUPABASE_KEY` present. To rotate/re-set:

  ```
  npx wrangler secret put SUPABASE_URL
  npx wrangler secret put SUPABASE_KEY
  ```

  Use `wrangler secret` (NOT `wrangler pages secret` — wrong product).
  Use the Supabase **anon key** (not service_role — service_role bypasses RLS).

- [ ] **3.2** Configure Supabase redirect URLs _(Supabase Dashboard > Authentication > URL Configuration)_:
  - Set **Site URL** to `https://wod-assist.patryk-jachowski.workers.dev`
  - Add `https://wod-assist.patryk-jachowski.workers.dev/**` to **Redirect URLs**
  - Required for email confirmation links and any future OAuth callbacks

- [ ] **3.3** Verify Supabase email confirmation setting _(Supabase Dashboard > Auth > Providers > Email)_:
  - If **"Confirm email" is enabled**: users must click a confirmation link before signin. The app has no `/api/auth/callback` route yet. **Recommendation for MVP: disable email confirmations** to simplify.
  - If **disabled**: signup works immediately, no callback route needed.

---

## Phase 4: Redeploy _(agent-automated — OPTIONAL, low value)_

Production is healthy — Worker live, auth works, no banner. The only thing a redeploy ships is the corrected `site:` value (the deployed sitemap still points at `pages.dev`) plus the defensive `config-status.ts` refactor. Purely sitemap/SEO hygiene; do it whenever you next deploy for a real reason.

- [ ] **4.1** Ensure Phase-1 changes are committed (Phase 1.8)
- [ ] **4.2** Clean build: `rm -rf dist && npm run build`
- [ ] **4.3** Deploy: `npx wrangler deploy`
  - Note: `wrangler deploy` (NOT `wrangler pages deploy`)
  - Output shows the deployed version ID and the `*.workers.dev` URL
- [ ] **4.4** Confirm the config warning is gone: the homepage HTML must no longer contain "Supabase nie jest skonfigurowany"

**Troubleshooting:**

- "Script too large" → bundle exceeds 3 MiB; upgrade to the $5/mo paid plan (10 MiB limit)
- Secrets not visible at runtime → secrets attach to the live Worker immediately, but a code-level fix (like 1.5) requires a redeploy to take effect
- ASSETS binding errors → keep the `assets` block in `wrangler.jsonc`; the adapter requires it

---

## Phase 5: Cleanup — delete the stale Pages project _(user-interactive — human-only)_

The dead Pages project `wod-assist` causes `wod-assist.pages.dev` to 404, masquerading as a broken deploy. Project deletion is irreversible → **human-on-irreversibles posture: run this yourself.**

- [x] **5.1** Deleted via `npx wrangler pages project delete wod-assist --yes` (2026-06-02).
- [x] **5.2** Confirmed: `wrangler pages project list` no longer lists `wod-assist`; Worker still healthy (root 200, `/dashboard` 302); `wod-assist.pages.dev` no longer resolves to a project.

---

## Phase 6: Post-Deploy Verification _(user in browser)_

Base URL: `https://wod-assist.patryk-jachowski.workers.dev`

- [ ] **6.1** Open `/` — landing page renders, **no Supabase config warning banner** (the 4.4 check, in browser)
- [ ] **6.2** Open `/dashboard` while unauthenticated → redirects to `/auth/signin` (verified via curl: 302)
- [ ] **6.3** Create account at `/auth/signup` — form submits, redirects to `/auth/confirm-email`
- [ ] **6.4** Sign in at `/auth/signin` → redirects to `/`, topbar shows user email
- [ ] **6.5** Access `/dashboard` while authenticated — dashboard renders with the user's email
- [ ] **6.6** Sign out → redirects to `/`, signed-out state
- [ ] **6.7** Sign in with wrong credentials → error message on `/auth/signin`
- [ ] **6.8** Open a non-existent route → 404 page served (per `not_found_handling: "404-page"`)

---

## Phase 7: CI/CD Auto-Deploy _(optional — agent + user)_

- [ ] **7.1** User creates a Cloudflare API token _(Dashboard > My Profile > API Tokens)_:
  - Permission: `Account > Workers Scripts > Edit` (Workers, **not** Pages)
- [ ] **7.2** User adds GitHub repo secrets _(GitHub > Settings > Secrets > Actions)_:
  - `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (`c124df48fe17c4074079c356b4d4080a`)
- [ ] **7.3** Agent adds a deploy job to `.github/workflows/ci.yml`:
  ```yaml
  deploy:
    needs: ci
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx astro sync
      - run: npm run build
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  ```
  Note: `wrangler deploy`, not `wrangler pages deploy`.
- [ ] **7.4** Push a trivial change to `main` — verify the deploy job runs and deploys.

---

## Phase 8: Hardening _(agent-automated)_

- [ ] **8.1** Add security headers in `src/middleware.ts` — append to the response after `next()`:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - **No CSP** — Astro inlines scripts/styles; a strict CSP without nonces would break hydration
- [ ] **8.2** Add `public/_headers` for static assets — same headers as 8.1 (covers assets served directly, not through the Worker)
- [ ] **8.3** Rollback procedure (Workers):
  - List versions: `npx wrangler deployments list`
  - Roll back: `npx wrangler rollback [<version-id>]` (instant, no rebuild)

---

## Verification

After all phases:

1. `https://wod-assist.patryk-jachowski.workers.dev` loads and renders, no config warning
2. Full auth flow works (signup → signin → dashboard → signout)
3. Protected route redirects unauthenticated users
4. `npx wrangler tail` shows clean request logs
5. Security headers present (`curl -I https://wod-assist.patryk-jachowski.workers.dev`)
6. Stale Pages project deleted (`wod-assist.pages.dev` no longer resolves to a project)
7. CI deploys on push to `main` (if Phase 7 completed)

## Free-tier limits (Workers)

- **Requests:** 100,000 / day (static-asset requests are free and don't count)
- **CPU time:** 10 ms / request (network I/O waiting on Supabase does NOT count as CPU)
- **Bundle size:** 3 MiB gzipped (10 MiB on the $5/mo paid plan) — watch `dist/_worker.js`
