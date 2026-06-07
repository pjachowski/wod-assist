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

## 10xDevs AI Toolkit - Module 2, Lesson 1

Move from sprint-zero setup to project orchestration with the **roadmap chain**:

```
(Module 1 foundation docs) -> /10x-roadmap -> backlog-ready roadmap items
```

`/10x-roadmap` is the lesson focus. `/10x-new` is intentionally introduced in Module 2, Lesson 2, when a selected roadmap item becomes an implementation change folder.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Roadmap (lesson focus)** | |
| `/10x-roadmap` | You have `context/foundation/prd.md` and a scaffolded project baseline, and you need a vertical-first MVP roadmap. The skill reads the PRD, inspects the code baseline, uses available foundation docs such as `tech-stack.md`, `infrastructure.md`, and `deploy-plan.md`, then writes `context/foundation/roadmap.md`. Use it BEFORE creating per-change folders or implementation plans. |
| **Re-run upstream if needed** | |
| `/10x-shape` / `/10x-prd` / `/10x-tech-stack-selector` / `/10x-bootstrapper` / `/10x-agents-md` / `/10x-infra-research` | Bundled from Module 1 so foundation contracts can be fixed before roadmap sequencing. If roadmap generation exposes a PRD gap, repair the PRD before pretending the backlog is ready. |

### How the chain hands off

- `/10x-roadmap` bridges product and implementation. It does not choose frameworks, design schemas, or write a per-change implementation plan.
- The output is `context/foundation/roadmap.md`: ordered milestones, vertical slices, bounded foundations, dependencies, unknowns, risk, and backlog handoff fields.
- Roadmap items should receive stable human-readable identifiers in backlog tools. The actual `context/changes/<change-id>/` folder is created in Lesson 2 with `/10x-new`.

### Roadmap boundaries

- Default to vertical slices: user-visible outcomes that cross UI, data, business logic, and integrations.
- Horizontal work is allowed only as a bounded enabler that names the downstream vertical milestone it unlocks.
- Avoid orphan horizontal work such as "build the whole database", "build all API endpoints", or "design the whole UI" before the first user-visible flow.
- Roadmap is not a calendar estimate. Do not invent dates, story points, or sprint velocity unless the user explicitly asks for a separate planning artifact.

### Foundation paths used by this lesson

- `context/foundation/prd.md` - input
- `context/foundation/tech-stack.md` - optional input
- `context/foundation/infrastructure.md` - optional input
- `context/deployment/deploy-plan.md` - optional input
- `context/foundation/roadmap.md` - output
- `context/foundation/lessons.md` - recurring rules and pitfalls
- `docs/reference/contract-surfaces.md` - load-bearing names registry

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
