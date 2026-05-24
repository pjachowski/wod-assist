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
