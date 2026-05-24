---
bootstrapped_at: 2026-05-24T07:16:57Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: wod-assist
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: wod-assist
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
```

### Why this stack (verbatim from hand-off body)

Solo developer shipping WodAssist as an after-hours MVP in 3 tygodnie (deadline 2026-07-05) needs a battle-tested, agent-friendly starter that handles auth + database + edge deploy out of the box. 10x Astro Starter (Astro 6 + React 19 + TypeScript + Tailwind 4 + Supabase + Cloudflare) is the recommended default for (web-app, js) and clears all four agent-friendly gates: typed end-to-end, convention-based layout, popular in JS training data, well-documented. Supabase covers email+password auth, password reset, long sessions, and PostgreSQL with row-level security — directly satisfying FR-001..FR-004 and the per-user data isolation guardrail. has_ai is true because FR-010, FR-021, FR-030 and FR-031 require LLM-backed plan parsing and workout suggestion generation; the JS stack lets any major LLM SDK plug in via fetch from Cloudflare Workers. Payments, realtime, and background jobs are explicitly out of scope per PRD Non-Goals. CI on GitHub Actions with auto-deploy-on-merge to Cloudflare Pages is the starter's standard shape. Bootstrapper confidence: first-class — expect mostly-smooth scaffolding with occasional manual steps.

## Pre-scaffold verification

| Signal      | Value                                                          | Severity | Notes                                                        |
| ----------- | -------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| npm package | not run                                                        | n/a      | cmd_template starts with `git clone`; no npm package to query |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-05-17       | fresh    | from card.docs_url; 7 days before bootstrap                  |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 19
**Conflicts (.scaffold siblings)**: CLAUDE.md (existing user CLAUDE.md preserved; scaffold copy at `CLAUDE.md.scaffold`)
**.gitignore handling**: moved silently (cwd had no .gitignore)
**.bootstrap-scaffold cleanup**: deleted

### Top-level entries moved from scaffold into cwd

`.env.example`, `.github/`, `.gitignore`, `.husky/`, `.nvmrc`, `.prettierrc.json`, `.vscode/`, `CLAUDE.md` (renamed to `CLAUDE.md.scaffold`), `README.md`, `astro.config.mjs`, `components.json`, `eslint.config.js`, `node_modules/`, `package-lock.json`, `package.json`, `public/`, `src/`, `supabase/`, `tsconfig.json`, `wrangler.jsonc`.

### Preserved pre-existing cwd entries

`.claude/`, `.git/`, `CLAUDE.md`, `context/`, `ideas-notes.md` — untouched. The scaffold did not ship a `context/` directory, so the conflict-matrix drop rule did not need to fire.

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW (total 10, across 895 dependencies)
**Direct vs transitive**: 0 / 0 / 2 / 0 direct of total 0 / 1 / 9 / 0 (CRITICAL/HIGH/MODERATE/LOW). Direct findings limited to MODERATE tier (`@astrojs/check`, `wrangler`). The lone HIGH finding (`devalue`) is transitive.

#### CRITICAL findings

none.

#### HIGH findings

- **devalue** — DoS via sparse array deserialization (Svelte advisory GHSA-77vg-94rm-hx3p). Transitive (pulled in via Astro/Svelte tooling). Fix available upstream.

#### MODERATE findings

- **@astrojs/check** — direct; pulled in `@astrojs/language-server` chain. Fix available.
- **@astrojs/language-server** — transitive; via `volar-service-yaml`. Fix available.
- **@cloudflare/vite-plugin** — transitive; via `miniflare`, `wrangler`, `ws`. Fix available.
- **miniflare** — transitive; via `ws`. Fix available.
- **volar-service-yaml** — transitive; via `yaml-language-server`. Fix available.
- **wrangler** — direct; via `miniflare`. Fix available.
- **ws** — transitive; uninitialized memory disclosure (GHSA-58qx-3vcg-4xpx). Fix available.
- **yaml** — transitive; stack overflow via deeply nested YAML collections (GHSA-48c2-rrv3-qjmp). Fix available.
- **yaml-language-server** — transitive; via `yaml`. Fix available.

#### LOW / INFO findings

none.

### Suggested remediation (do not run automatically)

`npm audit fix` resolves the non-breaking subset. `npm audit fix --force` covers the rest but ships breaking-change updates — review the changelog before applying. Bootstrapper deliberately does not auto-fix; this decision belongs to the user.

## Hints recorded but not acted on

| Hint                      | Value                       |
| ------------------------- | --------------------------- |
| bootstrapper_confidence   | first-class                 |
| quality_override          | false                       |
| path_taken                | standard                    |
| self_check_answers        | null                        |
| team_size                 | solo                        |
| deployment_target         | cloudflare-pages            |
| ci_provider               | github-actions              |
| ci_default_flow           | auto-deploy-on-merge        |
| has_auth                  | true                        |
| has_payments              | false                       |
| has_realtime              | false                       |
| has_ai                    | true                        |
| has_background_jobs       | false                       |

These hints are stored for the future agent-context skill (M1L4) that will translate them into `CLAUDE.md` / `AGENTS.md` content. Bootstrapper v1 records them; it does not act on them.

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- The existing `.git/` is already initialised. The scaffold's upstream history was deleted before move-up, so the next commit on this branch will record the bootstrap as a single change set.
- Review `CLAUDE.md.scaffold` against the existing `CLAUDE.md`. Decide which sections (if any) from the starter's defaults should fold into the project CLAUDE.md, then delete `CLAUDE.md.scaffold`.
- Address the audit findings per project risk tolerance. The 1 HIGH (`devalue`) is transitive with a fix available upstream; `npm audit fix` will pick up the non-breaking subset.
- Copy `.env.example` to `.env` and fill in Supabase + Cloudflare credentials before running the dev server.
