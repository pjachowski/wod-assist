---
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
---

## Why this stack

Solo developer shipping WodAssist as an after-hours MVP in 3 tygodnie (deadline 2026-07-05) needs a battle-tested, agent-friendly starter that handles auth + database + edge deploy out of the box. 10x Astro Starter (Astro 6 + React 19 + TypeScript + Tailwind 4 + Supabase + Cloudflare) is the recommended default for (web-app, js) and clears all four agent-friendly gates: typed end-to-end, convention-based layout, popular in JS training data, well-documented. Supabase covers email+password auth, password reset, long sessions, and PostgreSQL with row-level security — directly satisfying FR-001..FR-004 and the per-user data isolation guardrail. has_ai is true because FR-010, FR-021, FR-030 and FR-031 require LLM-backed plan parsing and workout suggestion generation; the JS stack lets any major LLM SDK plug in via fetch from Cloudflare Workers. Payments, realtime, and background jobs are explicitly out of scope per PRD Non-Goals. CI on GitHub Actions with auto-deploy-on-merge to Cloudflare Pages is the starter's standard shape. Bootstrapper confidence: first-class — expect mostly-smooth scaffolding with occasional manual steps.
