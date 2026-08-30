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
cannot access a wedding they do not belong to.

**Budget** — create / edit / delete item; partial payment; total paid; total
committed; available budget; over-budget state.

**Tasks** — create; update; complete; overdue state.

**Vendors** — create; update; link to task; link to budget item.

**Guests** — create; update; confirmed delete; positive whole-number party size; derived headcount; cross-wedding access denied.

**Eve** — reads correct wedding; reads correct totals; creates a task; updates a
budget item; created/updated data appears in the normal UI.

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
