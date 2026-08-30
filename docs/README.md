# Wedding Planner V1 — Docs

Durable build context for the Wedding Planner application.

## Read order

1. `../AGENTS.md` — commands, repository map, and conventions.
2. `NORTH_STAR.md` — what the product is and what V1 includes.
3. `PRODUCT_SPEC.md` — how the product should behave.
4. `BUILD_PLAN.md` — the foundation gate, product build sequence, current status, and proof points.
5. `ENGINEERING.md` — money, dates, Eve, UI, testing, and workflow rules.
6. `../SECURITY.md` — trust boundaries, deployment controls, and known gaps.

## Core rule

Build Dashboard + Budget + Planner + Guests + Eve as one usable V1.

Pass the security, delegated Eve identity, audit, observability, and recovery
foundation gate before expanding product work. Do not expand V1 scope until the
complete user flow works.
