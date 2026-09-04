---
version: 2
status: locked
---

# Current Lock

This is the current execution contract for the project. Keep one current lock only.

## North star

Open the app and immediately know what needs attention, what the wedding costs, and what to do next. Eve handles the administration.

## Chosen direction

F3 — Durable audit events (BUILD_PLAN.md F3). Add immutable, wedding-scoped
`auditEvents`, written in the same Convex transaction as each important
successful mutation, with an unforgeable server-derived `source`
(`ui`, `eve`, or `system`), actor principal, actor kind, controlled action and
entity labels, entity id, and timestamp.

## Why

F3 is the next foundation gate per BUILD_PLAN.md's execution order. F0-F2 are
shipped; F3 is the current gate blocking F4 (Eve delegated auth), F5
(telemetry), and F6 (backup/restore). Without a trustworthy, tamper-resistant
audit trail, Eve's delegated-auth work (F4) has no way to prove which actor
did what, which is required before Eve can act on a user's behalf in
production.

## Boundaries / Not now

- Do not start F4 (Eve delegated authentication) — that is the next gate,
  not this one.
- Do not change existing authorization rules, `tests/fixtures/identities.ts`,
  or any `*-authz.test.ts` file.
- Audit rows must exclude wedding content: no prompts, notes, contact
  details, money amounts, tokens, or document snapshots — only ids,
  controlled labels, actor, source, and timestamp (SECURITY.md "Data
  handling", "Required controls").
- `auditEvents` is not a substitute for operational telemetry (F5) and must
  not become a hidden copy of wedding state (SECURITY.md).
- Work happens on `main`, per current repo convention for this ticket line.

## Reopen only if

- BUILD_PLAN.md's execution order changes (e.g. F3 is reprioritized behind
  another gate).
- The F3 ticket (T-20260904-0002) is closed/superseded and a new gate is
  opened.
- Evidence emerges that audit events cannot be made unforgeable without
  changes to authz rules or identity fixtures that are currently out of
  scope — in that case the boundary itself needs re-negotiation, not silent
  violation.

## Done when

All 5 proof points from BUILD_PLAN.md F3 are demonstrated by convex-test
specs:

1. Each important successful mutation creates the expected event exactly
   once.
2. A rejected mutation creates no success event.
3. Only wedding members can read that wedding's history.
4. There is no public API to alter historical events.
5. A normal UI caller cannot forge `source: "eve"` or `source: "system"`.

## Known unknowns

- Exact mechanism for deriving `source: "eve"` server-side (a purpose-specific
  path with independently verified Eve context, or another supported
  attestation) is deferred to F4's delegated-auth design; F3 only needs to
  prove that a normal UI caller cannot forge it today.
- Full list of "important successful mutations" requiring an audit event is
  not enumerated in the docs read so far — needs confirmation against the
  actual mutation set before implementation (see
  `_tmp/HANDOFF-T-20260904-0002.md` / `_tmp/HANDOFF-f3.md` for detail not
  re-verified here).

When the lock changes materially, increment `version`. Do not keep decision history here; Git already does that.
