# CLAUDE.md

## Commands

- `npm run dev` — start dev server (Cloudflare workerd runtime via `@astrojs/cloudflare`)
- `npm run build` — production build (SSR)
- `npm run preview` — preview production build locally
- `npm run lint` / `npm run lint:fix` — ESLint with type-checked rules (`strictTypeChecked` + `stylisticTypeChecked` + Astro + React + jsx-a11y + react-compiler)
- `npm run format` — Prettier (`printWidth: 120`, includes `prettier-plugin-astro` and `prettier-plugin-tailwindcss`)
- Pre-commit (husky + lint-staged): `eslint --fix` on `*.{ts,tsx,astro}`, `prettier --write` on `*.{json,css,md}`

Local Supabase stack: `npx supabase start` (requires Docker). Deploy: `npx wrangler deploy`.

Run `npx astro sync` after cloning or changing Astro env/content config — generates types that lint and build depend on.

## Architecture

Astro 6 SSR (`output: "server"`) on Cloudflare Workers, with React 19 islands, Tailwind 4, Supabase auth, and shadcn/ui (`new-york` variant). Node 22.14.0 pinned in `.nvmrc`.

UI language is Polish — all user-facing strings, labels, and messages must be in Polish.

### Rendering & API

- Every page is server-rendered. API routes (`src/pages/api/**`) must export `export const prerender = false` to opt out of static generation.
- Env vars `SUPABASE_URL` / `SUPABASE_KEY` are declared in `astro.config.mjs` via `envField` as **server-only secrets** — they reach code only through `astro:env/server`, never bundled to the client.
- Locally: `.env` for `npm run dev` (Node), `.dev.vars` for Wrangler/Cloudflare local dev. Cloud: `npx wrangler secret put`.

### Auth flow (multi-file — read in this order)

1. `src/lib/supabase.ts` — builds a `@supabase/ssr` client tied to incoming request headers + cookies. Returns `null` if env vars are missing (intentional — `config-status.ts` surfaces this).
2. `src/middleware.ts` — runs on every request, resolves `context.locals.user`, redirects unauthenticated traffic away from any path in the local `PROTECTED_ROUTES` array. **Add new protected paths there**, not via per-page guards.
3. `src/pages/api/auth/{signin,signup,signout}.ts` — POST endpoints invoked by the auth forms.
4. `src/pages/auth/{signin,signup,confirm-email}.astro` — UI; `src/pages/dashboard.astro` is the protected-route example.

### Conventions

- **Path alias**: `@/*` → `./src/*` (tsconfig). Use it instead of relative `../../` chains.
- **Class merging**: `cn()` from `@/lib/utils` (clsx + tailwind-merge). Don't concatenate class strings manually.
- **shadcn/ui**: components in `src/components/ui/`. Add new ones via `npx shadcn@latest add <name>` — config in `components.json`.
- **API routes**: validate input with `zod` at the route boundary.
- **Supabase migrations** (when adding tables beyond auth): `supabase/migrations/<YYYYMMDDHHmmss>_<short_description>.sql`. Always enable RLS and write per-operation, per-role policies. Currently MVP uses only Supabase Auth — no custom tables or migrations exist yet.
- **React hooks**: extract to `src/components/hooks/` (create dir when first needed). Services / business logic to `src/lib/` (or `src/lib/services/`).
- **Shared types** (entities, DTOs): `src/types.ts` (create when first needed).

### CI

`.github/workflows/ci.yml` runs lint + build on every push/PR to `master`. Requires `SUPABASE_URL` + `SUPABASE_KEY` repo secrets (build step touches `astro:env` validation).

No test framework is configured yet — do not assume vitest/jest/playwright are available.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 2

Turn one roadmap item into the first implementation cycle with the **change planning chain**:

```
/10x-roadmap -> /10x-new -> /10x-plan -> /10x-plan-review -> /10x-implement
```

`/10x-new`, `/10x-plan`, `/10x-plan-review`, and `/10x-implement` are the lesson focus. `/10x-frame` and `/10x-research` are not required rituals here; they are escalation paths introduced in the next lesson.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Change setup (lesson focus)** | |
| `/10x-new <change-id>` | You selected a roadmap item and need a stable change folder. Creates `context/changes/<change-id>/change.md` so planning, implementation, progress, commits, and later review all share one identity. Use AFTER roadmap selection, BEFORE `/10x-plan`. |
| **Planning (lesson focus)** | |
| `/10x-plan <change-id>` | You have a change folder and need a reviewable implementation plan. Reads roadmap context, foundation docs, codebase evidence, and any existing change notes; writes `plan.md` and `plan-brief.md` with phases, file contracts, success criteria, and `## Progress`. |
| **Plan readiness (lesson focus)** | |
| `/10x-plan-review <change-id>` | You have `plan.md` and need a light pre-code readiness check. Use it to catch missing end state, weak contracts, malformed progress, scope drift, or blind spots before code changes begin. |
| **Implementation (lesson focus)** | |
| `/10x-implement <change-id> phase <n>` | You have an approved plan and want to execute one phase with verification, manual gate, commit ritual, and SHA write-back to `## Progress`. |
| **Lifecycle closure** | |
| `/10x-archive <change-id>` | A change is merged or intentionally closed. Move it out of active `context/changes/` into archive state. |

### How the chain hands off

- `/10x-new` creates the durable change identity.
- `/10x-plan` turns that identity into an implementation contract.
- `/10x-plan-review` checks the plan before the agent mutates code.
- `/10x-implement` executes one planned phase, verifies, asks for manual confirmation when needed, commits, and records progress.

### Lesson boundaries

- Plan is the default router after roadmap selection. Start with `/10x-plan` unless the problem is unclear or external evidence is blocking.
- Do not run `/10x-frame + /10x-research` as ceremony for every change.
- Do not turn this lesson into a full end-to-end product build. A checkpoint with a planned and partially or fully implemented stream is valid.
- Code review of the implemented diff belongs to Lesson 3 via `/10x-impl-review`.
- Lifecycle closure via `/10x-archive` after a change is merged or intentionally closed.

### Paths used by this lesson

- `context/foundation/roadmap.md` - upstream roadmap
- `context/changes/<change-id>/change.md` - change identity
- `context/changes/<change-id>/plan.md` - implementation contract
- `context/changes/<change-id>/plan-brief.md` - compressed handoff
- `context/foundation/lessons.md` - recurring rules and pitfalls
- `docs/reference/contract-surfaces.md` - load-bearing names registry

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
