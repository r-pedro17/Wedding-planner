# Wedding Planner

## Project

Wedding Planner V1 — a calm, non-spreadsheet web app for one couple to run one
wedding: a dashboard of what needs attention now, a simple budget, a task +
vendor planner, a guest headcount, and **Eve**, an assistant that reads and writes the same data
through explicit tools. Next.js App Router + TypeScript on the front, **Convex**
as the single source of truth, **Clerk** for auth. Eve runs on the `eve`
framework in `agent/`. No custom backend server.

Product intent and scope live in `docs/` — read them before changing code:
`docs/NORTH_STAR.md`, `docs/PRODUCT_SPEC.md`, `docs/BUILD_PLAN.md` (build stages
+ proof points), `docs/ENGINEERING.md` (money, dates, Eve, UI, testing, workflow
rules).

## Commands

Node 24 is required (see `.node-version`) and the package manager is **pnpm**.
Run `pnpm install` once, then run commands from the repository root. On this
Windows workstation, if Node is not already on `PATH`, use
`$env:Path = 'D:\node24;' + $env:Path` in PowerShell or
`export PATH="/d/node24:$PATH"` in Git Bash.

- `pnpm dev` — Next.js dev server (`localhost:3000`)
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — ESLint, zero warnings tolerated
- `pnpm lint:ox` — Oxlint, zero warnings tolerated
- `pnpm typecheck` — strict `tsc --noEmit` (includes `convex/`)
- `pnpm test` — Vitest run
- `pnpm fallow` — full structural health report (JSON)
- `pnpm verify` — the local equivalent of the required CI quality job
- `pnpm exec convex dev` — Convex dev deployment + codegen (needs browser login)
- `pnpm exec convex codegen` — regenerate Convex types without keeping dev running
- `pnpm dlx clerk@latest doctor --json` — Clerk CLI health check. In Git Bash,
  pass API paths with a leading double slash (`clerk api //jwt_templates`) or
  MSYS rewrites them into Windows paths and every call 404s.

## Structure

- `app/` — routes: `dashboard/`, `budget/`, `planner/`, `guests/`, `settings/`; root layout holds the Clerk + Convex providers and the Eve entry point
- `components/` — `ui/` (small primitives, only the ones actually used), `budget/`, `planner/`, `guests/`, `eve/`
- `convex/` — `schema.ts` (all V1 tables), `weddings.ts`, `budgets.ts`, `tasks.ts`, `vendors.ts`, `guests.ts`, `reminders.ts`, `crons.ts`, `lib/` (`auth.ts` membership guards, plus pure domain logic shared with the UI), `_generated/` (generated — never edit)
- `agent/` — Eve: `agent.ts`, `instructions.md`, `tools/` (`budget.ts`, `planner.ts`, `vendors.ts`), `skills/`, `lib/convex.ts` (Convex client), `channels/`. Framework files owned by `eve` — leave scaffold alone
- `tests/` — Vitest specs for the domain logic in `convex/lib/`
- `docs/` — durable product + engineering context
- `.github/` — clean-checkout CI workflows and Dependabot policy
- `SECURITY.md` — trust boundaries, required controls, incident response, and security proof gaps
- `_tmp/` — scratch files we create (git-ignored); `.local/` — local cache/system files (git-ignored)

## Conventions

- **Convex is the source of truth.** Every wedding-owned row carries `weddingId`; every wedding-scoped query/mutation asserts membership via `convex/lib/auth.ts`. Never store important wedding state only in Eve/chat.
- **Money is integer minor units (cents).** No floats for accounting. Recompute totals from source rows. No LLM arithmetic. See `docs/ENGINEERING.md`.
- **Dates are date-only `YYYY-MM-DD` strings**, timezone-safe, deterministic. Test overdue / today / upcoming / no-date. See `docs/ENGINEERING.md`.
- Domain maths lives in `convex/lib/*.ts` with Vitest tests — never inline in a component.
- The normal UI must work fully **without Eve**. Eve and the UI read/write the same Convex data. Eve writes only through small, purpose-specific tools and explains ambiguous or destructive writes first.
- The app must render **without Clerk/Convex env vars** — features degrade, nothing throws.
- State: Convex React hooks for server state; auth state via Clerk providers.
- Smallest complete change → focused tests → broader tests → verify the real user flow. No speculative refactors. No abstraction before two real call sites. Obvious code over clever.
- **V1 scope is Dashboard + Budget + Planner + Guests + Eve.** Guests means only invitation parties, optional notes, and derived headcount. Not in V1: RSVP, seating, wedding website, registry, marketplace, payments, email ingestion, native mobile, proactive Eve automation. Don't expand scope; don't add planning docs.
- `.env.local` is never committed; keep `.env.example` current.
- GitHub CI is the clean-checkout contract: quality, dependency health, and
  changed-code Fallow checks run independently. Keep ordinary CI free of live
  Clerk, Convex, Vercel, and Hostinger credentials. See `SECURITY.md`.
- Auth: Clerk issues the JWT, Convex verifies it. The template named `convex`
  must carry `{"aud": "convex"}`, and `CLERK_JWT_ISSUER_DOMAIN` lives on the
  Convex deployment, not in `.env.local`. Get either wrong and the app is
  silently signed-out with no error — see `convex/auth.config.ts`.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
