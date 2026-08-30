# Wedding Planner — Engineering Rules

Durable rules for agents and humans working in this repo. Product shape is in
`NORTH_STAR.md` and `PRODUCT_SPEC.md`; build stages and proof points are in
`BUILD_PLAN.md`. This file is the "how to build it well" layer.

The target user does not like spreadsheets. Simplicity matters more than feature
count. Do not redesign the product unless a requirement is technically
impossible or clearly contradictory.

---

## Core rules

1. Convex is the source of truth.
2. Eve reads and writes through explicit tools.
3. Never store important wedding state only inside Eve/chat memory.
4. The normal UI must work without Eve.
5. The Eve UI must reflect the same data as the normal UI.
6. Use deterministic code for money, totals, dates, permissions, and validation.
7. Do not use an LLM for arithmetic.
8. Keep the number of concepts small.
9. Do not add infrastructure without a demonstrated need.
10. Keep guest planning to invitations and headcount; do not drift into RSVP or seating workflows.
11. Attribute important writes to the authenticated person, including writes made through Eve.
12. Keep audit history in Convex and private diagnostics in observability; neither replaces the other.

---

## Workflow

For each change:

```text
Inspect → smallest complete change → focused tests → broader tests → verify the real user flow → continue
```

`pnpm verify` is the local clean-build contract. GitHub Actions repeats it from
a frozen lockfile and reports dependency audits and changed-code Fallow findings
as independent jobs. Ordinary CI must remain deterministic and secret-free: it
does not connect to Clerk, a live Convex deployment, Vercel, Hostinger, or Eve.
Provider-backed and browser proofs are explicit environment checks, not hidden
inside the compile/test gate. Security boundaries and response procedures live
in `../SECURITY.md`.

- No large speculative refactors.
- No abstraction before there are at least two real places that need it.
- Prefer obvious code over clever code.

### When you find a problem

1. Reproduce it.
2. Identify the actual cause.
3. Fix the smallest correct layer.
4. Add or improve the test that would have caught it.
5. Re-run the affected flow.

Do not patch symptoms in the UI when the source is domain logic or data.

---

## Money rules

Money is correctness-critical.

- One internal representation everywhere: **integer minor units** (cents).
- Never trust floating-point display values as stored accounting truth.
- Validate negative values deliberately.
- Recalculate totals from source records — never persist an AI-computed total.
- Budget calculations (`convex/lib/money.ts`, `convex/lib/budget.ts`) are pure and tested
  independently of any AI behavior.

Totals to compute from stored rows: total planned, total committed, total paid,
available/unallocated amount, remaining amount per item.

---

## Date rules

Dates are correctness-critical.

- Date-only values are `YYYY-MM-DD` strings. Treat the wedding date and due
  dates consistently.
- Avoid timezone bugs for date-only values (compare Y-M-D, or anchor to UTC).
- Keep date calculations deterministic (`convex/lib/dates.ts`).
- Always test: overdue, today, upcoming, and no-date cases.

---

## Eve rules

Eve is an interface to the system, not the system itself.

Eve should: read current wedding data, summarize it, help the user decide, call
explicit tools for changes, and explain ambiguous writes before doing them.

Eve should not: create hidden wedding state, silently guess missing money
values, silently delete important records, do arithmetic deterministic code can
do better, or hold unrestricted database access.

Keep Eve tools small and purpose-specific. For destructive or significant
changes (deleting a vendor or budget item, large or bulk budget changes), Eve
summarizes the intended change before committing. Low-risk additions and
corrections can be direct when the interaction stays obvious and reversible.

Starting tool surface: `getWeddingSummary`, `getBudget`, `addBudgetItem`,
`updateBudgetItem`, `getTasks`, `createTask`, `updateTask`, `completeTask`,
`getVendors`, `addVendor`, `updateVendor`. Add tools only when a real workflow
needs them.

### Eve request identity

- Authenticate every production Eve request with a short-lived Clerk credential.
- Verify issuer, audience, signature, and expiry server-side; a browser-provided
  user id is never authority.
- Define the browser-to-Eve and Eve-to-Convex credentials and audiences using
  supported adapters for the installed versions. Never reuse a token minted for
  one audience at the other hop or invent a custom token exchange.
- Carry identity in request/tool execution context and create the authenticated
  Convex client for that context. Never keep a user's token in global mutable
  state or a process-wide environment variable.
- Convex membership checks remain the final authorization decision.
- Eve audit events use the human actor and `source: "eve"`; Eve is not a
  permanent wedding member.
- `localDev()` or equivalent bypasses must have no production effect.

---

## Authorization rules

- Identity comes from `ctx.auth`, never from a client-supplied identity field.
- Every wedding-scoped operation establishes membership before returning or
  changing data.
- An operation addressed by document id loads the row and authorizes against its
  stored `weddingId` before use.
- A mutation that attaches a vendor or other parent reference verifies that the
  referenced row belongs to the same authorized wedding.
- Every public Convex function has explicit argument and return validators.
- Internal-only operations use internal functions rather than public endpoints.
- Use reusable tests for anonymous, owner, partner, and unrelated authenticated
  callers. Add cross-wedding reference cases whenever a function accepts an id.

Prefer not-found-or-inaccessible errors where distinguishing them would disclose
that another wedding's private row exists.

---

## Audit event rules

Audit events are durable product records, not telemetry.

- Store them in Convex with `weddingId`, actor principal, actor kind, source,
  controlled action/entity labels, entity id, and timestamp.
- `actorKind: "user"` requires the authenticated user's id. `actorKind: "system"`
  has no human actor id; never fabricate one for a cron or internal operation.
- Derive `source` from the server-side function path and verified execution
  context. Never accept `ui`, `eve`, or `system` as a free public argument.
- A delegated user credential proves the actor, not Eve provenance. Mark
  `source: "eve"` only through a purpose-specific path with independently
  verified Eve context or another supported attestation mechanism.
- Insert the audit event in the same mutation transaction as the successful
  change. Failed or rejected changes do not produce success events.
- Do not store prompts, notes, contacts, money amounts, credentials, or before /
  after document snapshots.
- Keep history immutable from the public API and membership-protect all reads.
- Use a small controlled action vocabulary; do not generate action names from
  user input.
- Test that ordinary UI callers cannot forge Eve or system provenance.

---

## Observability rules

Observability explains system health; it is not wedding state or audit history.

- Emit structured events with environment, service, event, severity, request id,
  duration, outcome, and safe error category where useful.
- Never send wedding names, user-supplied wedding/due dates, prompts, notes,
  contact details, amounts,
  tokens, cookies, authorization headers, or raw provider payloads.
- Sanitize exceptions before transmission. Do not assume an SDK removes private
  fields.
- Separate production and preview data, scope ingestion tokens narrowly, and
  keep remote telemetry off in local development by default.
- Test monitor delivery deliberately. A configured monitor with no verified
  notification path is not an operational control.
- Keep Convex on its deployment logs until a demonstrated retention or
  correlation need justifies paid streaming.

---

## Recovery rules

- Define RPO, RTO, backup cadence, retention, owner, storage, encryption, and
  deletion policy explicitly.
- Treat exported snapshots as sensitive production data: never commit them or
  place them in ordinary logs and fixtures.
- Restore drills target a disposable preview or isolated development deployment,
  never production.
- A drill passes only after row counts, representative relationships, membership,
  and derived totals are verified.
- Identify and announce the Convex deployment before export, import, or deploy.
  Production imports require fresh explicit approval and a post-restore check.

---

## UI rules

The user should not need instructions to use the core app.

Prefer: one clear primary action per screen, normal language, visible totals,
large touch targets, simple forms, responsive/mobile-friendly layouts, inline
editing where clearer, immediate feedback. Eve reachable from every important
screen. Consistent currency everywhere.

Avoid: spreadsheet-like density, dense tables where cards/lists are clearer,
hidden actions, configuration screens, advanced filters in V1, technical
terminology.

---

## Testing rules

Every important feature needs a simple proof it works. At minimum protect:

**Authentication** — unauthenticated user cannot access wedding data; user
cannot access a wedding they do not belong to; owner and partner have the
documented access; cross-wedding references are denied.

**Budget** — create / edit / delete item; partial payment; total paid; total
committed; available budget; over-budget state.

**Tasks** — create; update; complete; overdue state.

**Vendors** — create; update; link to task; link to budget item.

**Guests** — create; update; confirmed delete; positive whole-number party size; derived headcount; cross-wedding access denied.

**Eve** — reads correct wedding; reads correct totals; creates a task; updates a
budget item; created/updated data appears in the normal UI; request identity is
the initiating user; unrelated authenticated callers remain denied.

**Audit** — successful important mutations create one safe event; rejected
mutations create none; UI and Eve sources are distinguishable.

**Operations** — enforcing security headers preserve the signed-in flow;
synthetic failures reach the intended monitor; an isolated snapshot restore
recovers the expected data and relationships.

**Persistence** — refresh keeps data; sign out/in keeps data; authorized partner
sees the same state.

Do not accept a feature because the UI renders. Test the complete user path.

---

## Completion report

When the build is ready, report only:

1. What was built.
2. What was tested.
3. What remains broken or incomplete.
4. Exact steps for the user to verify V1 with their own eyes.

Do not claim completion if the full user flow has not been tested.
