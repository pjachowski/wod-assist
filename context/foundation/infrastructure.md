---
project: WodAssist
researched_at: 2026-05-24
recommended_platform: Cloudflare Workers + Pages
runner_up: Netlify
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6 SSR
  runtime: Cloudflare Workers (workerd)
---

## Recommendation

**Deploy on Cloudflare Workers + Pages.**

The project is already configured with `@astrojs/cloudflare` adapter and workerd runtime — deploying to Cloudflare requires zero adapter changes, zero env var refactoring, and zero local dev setup changes. At MVP traffic (10k-100k requests/month), the free tier covers all requests (100k/day allowance). Cloudflare scored 5/5 on all agent-friendly criteria: CLI-first via `wrangler`, fully managed serverless, agent-readable docs (`llms.txt` + markdown endpoints), deterministic deploy API, and 13+ GA MCP servers. For a solo developer on a 3-week deadline prioritizing cost minimization, the native fit eliminates the adapter-swap friction that every other platform would impose.

## Platform Comparison

| Platform                       | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP/Integration    | Weighted Score |
| ------------------------------ | --------- | ------------------ | ------------------- | ----------------- | ------------------ | -------------- |
| **Cloudflare Workers + Pages** | Pass      | Pass               | Pass                | Pass              | Pass               | ★★★★★          |
| **Netlify**                    | Pass      | Pass               | Pass                | Pass              | Pass               | ★★★★☆          |
| **Vercel**                     | Pass      | Pass               | Pass                | Pass              | Partial (beta MCP) | ★★★☆☆          |
| **Render**                     | Pass      | Partial            | Pass                | Pass              | Pass               | ★★★☆☆          |
| **Railway**                    | Pass      | Partial            | Partial             | Pass              | Pass               | ★★★☆☆          |
| **Fly.io**                     | Pass      | Partial            | Partial             | Pass              | Partial            | ★★☆☆☆          |

Weighted scores account for: cost sensitivity (free tier bonus), adapter alignment with existing codebase (major bonus for Cloudflare), and interview-driven weights. Raw criteria scores would place Netlify equal to Cloudflare — the difference is operational: Cloudflare requires no code changes.

### Shortlisted Platforms

#### 1. Cloudflare Workers + Pages (Recommended)

Native runtime match — the project already uses `@astrojs/cloudflare`, env vars access via `astro:env/server`, and local dev via `wrangler dev` simulation. Free tier covers 100k requests/day with zero egress fees. CLI (`wrangler`) is mature and GA: deploy, rollback, tail logs, manage secrets — all non-interactive. Documentation publishes `llms.txt` and serves any page as raw markdown. 13+ managed MCP servers cover DNS, WAF, Workers management, and a "Code Mode" server that compresses 2,500+ endpoints into fewer tokens. The Cloudflare Vite plugin (v1.0 GA) drives the Astro adapter.

#### 2. Netlify

Scored 5/5 on raw criteria — official `@astrojs/netlify` adapter (GA), MCP server (GA, 6 tools), `llms.txt` published, instant rollback to any previous atomic deploy, and `netlify logs` with structured JSON output designed for agent consumption. Free tier: 300 credits/month, 125K function invocations. The gap vs. Cloudflare is purely operational: deploying here requires swapping the adapter, changing env var access patterns, and accepting Lambda-based cold starts (800ms-1.5s). For a project not already committed to Cloudflare's runtime, Netlify would be the strongest alternative.

#### 3. Render

Strong agent story: GA MCP server with 20+ tools, `llms.txt` + `llms-full.txt`, dedicated "Using Render with Coding Agents" docs page, CLI with deploy/rollback/logs. Full Node.js runtime — zero compatibility risk with any npm package. WebSocket support (not needed now, but removes a future constraint). The gap: not truly serverless (persistent containers), $7/month minimum for no-spin-down service, and requires switching to generic `@astrojs/node` adapter. Best choice if workerd compatibility becomes a blocking issue.

## Anti-Bias Cross-Check: Cloudflare Workers + Pages

### Devil's Advocate — Weaknesses

1. **3 MiB bundle size limit on free tier.** React 19 + Astro SSR + any LLM SDK (for plan parsing and suggestions) will likely exceed this. The paid plan ($5/month) raises the limit to 10 MiB — expect to upgrade on day one of AI feature integration.
2. **workerd is not Node.js.** Despite `nodejs_compat`, unpolyfilled APIs (`node:fs`, `node:child_process`, some `node:crypto` methods) break silently at deploy time. Each new dependency is a compatibility check.
3. **Astro 6 + Cloudflare Vite plugin is freshly GA.** GitHub issue #15411 reports "Unsupported ESM URL scheme" errors with `cloudflare:workers` imports in some builds — active integration surface with potential for breaking changes.
4. **No real local parity.** `wrangler dev` uses miniflare to simulate workerd; edge cases exist (hanging on heavy fetch, different binding behavior). Production-only bugs are costly on a tight timeline.
5. **CPU time limits.** Free: 10ms CPU per invocation; paid: 30s. Complex AI response parsing could hit the free-tier wall (network wait is excluded, but CPU for parsing is not).

### Pre-Mortem — How This Could Fail

Six months in, WodAssist stalled at the AI suggestion feature. The first real deploy revealed the bundle exceeded 3 MiB once the LLM client was added — upgrade to paid solved that. Then the streaming response parser in the AI SDK used a Node.js API not covered by `nodejs_compat`. Three days vanished debugging a `TypeError` that appeared only in production (miniflare passed). The workaround: rewriting the parser to avoid the unsupported API — fragile code that breaks on the next SDK update. Meanwhile, Astro 6's adapter received a patch changing how `envField` resolves bindings, buried in a minor changelog. By week two, "just deploy" had consumed as much time as switching adapters would have, but sunk cost kept the team on Cloudflare. The suggestion latency (soft ~5s NFR) was met for cached paths but cold-start parsing of large Worker global scope occasionally pushed first requests past the target.

### Unknown Unknowns

- **No native `fetch` timeout in Workers.** If a Supabase or LLM API call hangs, there's no built-in safety net — you must implement `AbortController` timeouts yourself. A hanging upstream consumes CPU budget silently.
- **Pages Functions vs. Workers: subtle deployment model differences.** `@astrojs/cloudflare` compiles to Pages Functions. Some `wrangler` features (gradual rollouts, version pinning) are Workers-only and don't apply to Pages deployments.
- **Per-request Supabase client initialization.** Workers are stateless — each SSR hit creates a new HTTP connection to Supabase. No connection pooling adds ~50-100ms per request vs. a persistent Node.js server.
- **`ASSETS` binding name is reserved in Pages.** If any config accidentally uses it, the deploy fails with a cryptic error.
- **Credit card required for paid plan.** Free tier is generous for requests, but the 10 MiB bundle limit (likely needed with AI SDKs) requires the $5/month plan with a card on file.

## Operational Story

- **Preview deploys**: every push to a non-production branch automatically gets a unique preview URL (`<hash>.<project>.pages.dev`). Fork PRs also get previews. No authentication by default — add Cloudflare Access (free for up to 50 users) if the preview must be protected.
- **Secrets**: environment variables and tokens live in Cloudflare Workers Secrets (`wrangler secret put SUPABASE_KEY`). Encrypted at rest, not visible in dashboard after creation, accessible only at runtime. Rotation: delete + re-put. For local dev: `.dev.vars` file (gitignored).
- **Rollback**: `wrangler rollback [VERSION_ID]` — reverts to previous stable version instantly (no rebuild). Typical time-to-revert: seconds. Caveat: does not roll back database migrations (Supabase migrations are managed separately).
- **Approval**: human-required actions: publish custom domain DNS, rotate primary Supabase service key, delete the Pages project. Agent-safe actions: deploy, rollback, tail logs, put non-critical secrets, manage preview deployments.
- **Logs**: `wrangler tail` streams real-time logs (supports `--format json` for structured output). Historical logs: via Cloudflare dashboard or Logpush to external storage. MCP server provides `workers_logs_get` tool for structured queries.

## Risk Register

| Risk                                                           | Source           | Likelihood | Impact | Mitigation                                                                                                                            |
| -------------------------------------------------------------- | ---------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Bundle exceeds 3 MiB free-tier limit when AI SDK is added      | Devil's advocate | High       | Low    | Upgrade to $5/month paid plan (10 MiB limit). Budget this from day one.                                                               |
| AI/LLM SDK uses Node.js API not polyfilled by `nodejs_compat`  | Devil's advocate | Medium     | High   | Test SDK compatibility in a minimal Worker before integrating. Have `@astrojs/node` + Netlify as fallback adapter swap (2-4h work).   |
| Astro 6 Cloudflare adapter breaking change during sprint       | Devil's advocate | Low        | Medium | Pin `@astrojs/cloudflare` version in `package.json`. Don't auto-update during the 3-week sprint.                                      |
| Production-only bug not reproducible in miniflare              | Unknown unknowns | Medium     | Medium | Deploy early (day 1-2) with a hello-world route to validate the pipeline. Use `wrangler tail --format json` for production debugging. |
| Cold start on large global scope exceeds soft ~5s latency NFR  | Pre-mortem       | Low        | Medium | Keep Worker bundle lean. Defer heavy imports behind dynamic `import()`. Monitor with `wrangler tail` latency.                         |
| Supabase/LLM API call hangs without timeout                    | Unknown unknowns | Low        | High   | Wrap all external `fetch` calls with `AbortController` + 10s timeout. Add retry with exponential backoff.                             |
| Pages Functions lacks Workers-only features (gradual rollouts) | Unknown unknowns | Low        | Low    | Acceptable for MVP. If needed later, migrate from Pages to standalone Worker.                                                         |

## Getting Started

1. **Verify local dev works with existing config:**

   ```bash
   npm run dev
   ```

   The project already uses `@astrojs/cloudflare` — `npm run dev` runs via the Cloudflare Vite plugin providing workerd runtime fidelity locally.

2. **Authenticate wrangler:**

   ```bash
   npx wrangler login
   ```

3. **Create the Pages project (first deploy):**

   ```bash
   npx wrangler pages project create wod-assist
   ```

4. **Set production secrets:**

   ```bash
   npx wrangler pages secret put SUPABASE_URL
   npx wrangler pages secret put SUPABASE_KEY
   ```

5. **Deploy:**
   ```bash
   npm run build && npx wrangler pages deploy dist/
   ```
   Subsequent deploys: same command. Preview deploys happen automatically on branch pushes if you connect the GitHub repo in the Cloudflare dashboard.

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup (GitHub Actions workflow already exists in `.github/workflows/ci.yml`)
- Production-scale architecture (multi-region, HA, DR)
- Custom domain DNS configuration
- Cloudflare Access / authentication for preview deployments
