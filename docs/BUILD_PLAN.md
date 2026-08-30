# Wedding Planner — Build Plan

## Goal

Build the complete V1 as one coherent vertical slice.

The app is only ready for handoff when Dashboard + Budget + Planner + Guests + Eve work together against persistent Convex data.

The sections below are build stages, not separate product releases. The
foundation gate is the current execution order; the product stages remain the
authoritative capability requirements.

## Current implementation status

As of August 2026, the application spine, authentication, persistent Convex
data, Dashboard, basic Budget, basic Planner, vendor records, Clerk-user-id-based
couple sharing,
and a deliberately narrow guest headcount are implemented. Pure money, date,
budget, and guest validation logic has automated coverage, and
the production Next.js build passes.

The non-Eve UI is not yet a complete V1: budget items, tasks, and vendors do not
offer all documented edit/link fields; destructive UI actions need safer
confirmation and error handling; and Convex functions plus full browser flows do
not yet have automated coverage. Treat every unchecked proof point below as a
requirement to verify, not as a claim that it has passed.

Before more product work, the application must pass the foundation gate below.
Eve exists in the repo, but its production browser channel still has placeholder
authentication and its Convex client uses one environment-level token. Neither
is an acceptable production identity boundary.

---

# Foundation gate — current execution order

This pass proves that private wedding data is isolated, important changes are
attributable, failures are observable without leaking wedding content, and the
system can be recovered. It does not expand the user-facing V1 scope.

## F0 — Security model and test harness

Build reusable `convex-test` fixtures for an anonymous caller, a wedding owner,
their partner, and an authenticated member of another wedding. Inventory every
public Convex function and record the allowed identities and resources for each.

### Prove it works

- The authorization matrix covers every public query and mutation.
- CI can run the security suite without live Clerk or Convex credentials.
- Test fixtures contain no real wedding or identity data.

## F1 — Convex authorization proof

Audit every public function and add tests proving:

- Anonymous callers are denied.
- The owner and partner are allowed normal V1 access.
- An unrelated authenticated user is denied.
- IDs from another wedding cannot be read, changed, deleted, or attached.
- Vendor references on tasks and budget items belong to the same wedding.
- ID-based operations authorize against the stored row, not a client claim.
- Every public function has argument and return validators.

Membership management is owner-only. Both roles may manage ordinary wedding
data; only the owner may add the one V1 partner.

### Prove it works

- The complete authorization matrix passes.
- Rejected cross-wedding operations do not reveal or change protected data.
- `pnpm verify` remains green.

## F2 — Browser and deployment security

Add a Content Security Policy and the relevant security headers. Inventory the
minimum Clerk, Convex, Eve, Axiom, and Vercel origins; start CSP in report-only
mode, exercise the real flows, then enforce the reduced policy.

### Prove it works

- Clerk sign-in, Convex realtime updates, and the approved Eve origin work under
  enforcing CSP.
- The app cannot be framed by an unapproved origin.
- Automated checks assert the production header policy.
- No secret-valued environment variable enters the browser bundle.

## F3 — Durable audit events

Add immutable, wedding-scoped `auditEvents` for important successful mutations.
Each event records `weddingId`, an actor principal, actor kind, source
(`ui`, `eve`, or `system`), controlled action and entity labels, entity id, and
timestamp. Optional request ids may correlate an event without storing content.
For `actorKind: "user"`, the authenticated user id is required. For
`actorKind: "system"`, no human actor id is invented.

Write the event in the same Convex transaction as the change. Do not store
prompts, notes, contact details, money amounts, tokens, or document snapshots.
Derive `source` from a trusted server-side execution path; never accept `ui`,
`eve`, or `system` as an arbitrary public mutation argument. Eve provenance
requires a purpose-specific path with independently verified Eve context or
another supported attestation mechanism in addition to the delegated user.

### Prove it works

- Each important successful mutation creates the expected event exactly once.
- A rejected mutation creates no success event.
- Only wedding members can read that wedding's history.
- There is no public API to alter historical events.
- A normal UI caller cannot forge `source: "eve"` or `source: "system"`.

## F4 — Eve delegated authentication

Replace production `placeholderAuth()` and the process-wide
`CONVEX_AGENT_TOKEN`. Each Eve request must verify a short-lived Clerk credential,
carry that identity through the tool execution context, and call Convex as the
initiating person. Convex `requireMembership()` remains the final authorization
decision. Development-only access must remain development-only.

Begin with a supported-adapter spike against the installed Eve and Clerk
versions. Record the exact credentials, issuers, and audiences at both hops:
browser → Eve and Eve → Convex. Decide explicitly whether the browser supplies
separate scoped credentials, Eve performs a supported token exchange, or a
supported adapter provides delegation. Never reuse an Eve-audience token as a
Convex-audience token or invent a custom exchange.

The same trusted Eve context must drive audit provenance. A delegated user token
proves the human actor, but by itself does not prove that Eve initiated the call.

### Prove it works

- Anonymous, expired, wrong-issuer, and wrong-audience requests are denied.
- Owner and partner can use Eve for their wedding.
- An authenticated non-member reaches no wedding data.
- Concurrent users cannot share tokens or execution context.
- Eve writes record the human actor with `source: "eve"`.
- A UI caller using the same human identity cannot forge Eve provenance.
- Production needs no permanent couple or agent membership token.

No Eve capability expansion may begin until this stage passes.

## F5 — Privacy-minimal observability

Send structured Next.js, browser/Web Vitals, and Eve diagnostics to Axiom. Keep
Convex on its normal deployment logs until longer retention or centralized
correlation justifies a paid log stream. Separate environments, scope ingestion
tokens narrowly, and disable remote telemetry in local development by default.

Start with three monitors:

1. Production errors above a deliberately tested threshold.
2. Repeated authentication or authorization failures.
3. Eve provider/tool failures or abnormal latency.

Never send wedding names, user-supplied wedding/due dates, prompts, notes,
contacts, amounts, credentials,
authorization headers, or raw provider payloads. Do not encode vendor or wedding
content in exception messages or request ids.

### Prove it works

- Synthetic Next.js, browser, and Eve failures arrive with safe structured data.
- Web Vitals arrive without private content.
- Each monitor is deliberately triggered and its notification is received.
- Browser ingestion uses either a server proxy or a deliberately public,
  write-only token scoped to the intended dataset with no read/admin permission;
  no private telemetry credential or payload is exposed.

## F6 — Backup and restore drill

Define the recovery point objective, recovery time objective, export cadence,
retention, owner, encrypted storage location, and deletion policy. Start with a
daily user-controlled export and adjust only from an explicit recovery need.

Restore a current snapshot into a disposable preview or isolated development
deployment, never production during a drill. Compare critical row counts and
verify memberships, vendor links, derived budget totals, and audit references.
Treat every snapshot as sensitive production data and never commit it.

### Prove it works

- Export succeeds and the isolated restore completes.
- Weddings, memberships, budget data, tasks, vendors, guests, and audit events
  have the expected counts and representative relationships.
- The measured restore time meets the chosen recovery objective.
- The recovery runbook names exact target-selection and production-consent gates.

## F7 — Foundation production smoke test

Run the completed foundation against the intended deployment: the four-identity access
matrix, cross-wedding denial, enforcing CSP, delegated Eve reads and writes,
audit attribution, Axiom monitor delivery, and evidence from the latest restore
drill. Update `SECURITY.md` gaps only when the corresponding evidence exists.

### Foundation exit gate

- `pnpm verify` and the complete authorization suite pass.
- The authenticated owner and partner flows pass in production.
- Eve operates only with the initiating person's authority.
- Monitoring and recovery evidence are recorded without private data.
- Remaining limitations are stated explicitly; rendered UI is not completion.

---

# Stage 1 — Create the application spine

## Build

- Create the Next.js TypeScript app.
- Add Tailwind.
- Add shadcn/ui.
- Add Convex.
- Add Clerk.
- Deploy a basic version to Vercel early.

## Add the first domain model

Create:

- weddings
- memberships

A wedding needs at least:

- name
- wedding date
- currency
- total budget
- created by
- created at

## Prove it works

- User can sign in.
- User can create a wedding.
- Refresh does not lose the wedding.
- User can reopen the wedding.

Do not continue if persistence or authentication is unreliable.

---

# Stage 2 — Build the budget completely

## Add data

Create:

- budgetCategories
- budgetItems

## Add UI

Build a Budget screen where the user can:

- Add a category.
- Add an item.
- Edit an item.
- Delete an item.
- Enter planned amount.
- Enter quoted amount.
- Enter committed amount.
- Enter paid amount.
- Add a due date.
- Link a vendor later.

## Add calculations

Calculate:

- total planned
- total committed
- total paid
- available amount
- remaining amount per item

Put calculation logic in deterministic code. Do not use an LLM for arithmetic.

## Prove it works

Test at least:

1. Empty budget.
2. One budget item.
3. Several categories.
4. Partial payment.
5. Fully paid item.
6. Budget overrun.
7. Editing amounts.
8. Refresh persistence.

---

# Stage 3 — Build planner and vendors

## Tasks

Create task storage and UI.

Support:

- title
- notes
- due date
- owner
- status
- vendor link

## Vendors

Create vendor storage and UI.

Support:

- name
- type
- contact information
- website
- notes
- status

## Connect the data

Allow:

- budget item → vendor
- task → vendor

## Prove it works

- Create a vendor.
- Link it to a budget item.
- Create a task for that vendor.
- Mark the task done.
- Refresh and verify all relationships remain correct.

---

# Stage 4 — Build the dashboard

The dashboard should aggregate existing data. Do not create a second source of truth.

Show:

- wedding date
- days until wedding
- total budget
- committed amount
- paid amount
- available amount
- upcoming payments
- overdue payments
- upcoming tasks
- overdue tasks

## Prove it works

Change data in Budget and Planner and confirm the Dashboard updates immediately.

---

# Stage 5 — Add Eve

Add Eve only after the underlying application works without AI.

## Give Eve read tools first

Implement:

- getWeddingSummary
- getBudget
- getTasks
- getVendors

Test questions:

- "How much is left?"
- "What payments are due soon?"
- "What tasks are overdue?"
- "Which vendors have we booked?"

Eve must answer using Convex data.

## Then give Eve write tools

Implement:

- addBudgetItem
- updateBudgetItem
- createTask
- updateTask
- completeTask
- addVendor
- updateVendor

Test commands:

- "Add photographer for €1,800."
- "We paid €500 to the photographer."
- "Add choose flowers for next Friday."
- "Mark choose flowers done."

After each command, verify the normal UI changed too.

---

# Stage 6 — Shared use

Add the minimum sharing flow needed for the couple.

Prove:

- User A and User B can access the same wedding.
- Both see the same changes.
- Changes update through Convex realtime behavior.
- Neither can accidentally access another wedding.

Do not build advanced permissions.

---

# Stage 7 — Final real-user pass

Before calling V1 complete, test the app as a normal user.

## Run this complete scenario

1. Create a wedding.
2. Set the date and total budget.
3. Add venue.
4. Add photographer.
5. Add florist.
6. Record deposits.
7. Add payment dates.
8. Add five planning tasks.
9. Add vendors.
10. Ask Eve how much is left.
11. Ask Eve what should be done next.
12. Ask Eve to add an expense.
13. Ask Eve to complete a task.
14. Refresh.
15. Sign out.
16. Sign back in.
17. Open the wedding from another account with access.
18. Verify the state is correct everywhere.

Fix anything that makes this flow confusing or unreliable.

---

# Remaining product completion order

After F0–F7 pass, complete the existing product stages in this order:

1. Complete Budget add/edit/delete, amount states, due dates, notes, and vendor
   linking from Stage 2.
2. Complete Task and Vendor edit/link/delete flows from Stage 3.
3. Replace Clerk user-id entry with the owner-controlled partner invitation
   flow from Stage 6.
4. Certify every existing Eve read/write tool from Stage 5 before adding tools.
5. Run the two-account scenario in Stage 7, including audit, monitoring, and
   tenant-isolation evidence, then repeat the production security, delegated Eve,
   audit, monitor, and recovery checks affected by the product changes. This is
   the final V1 production certification.

---

# Stop conditions

Do not add new features while building V1 unless they are required to make the core flow usable.

If tempted to add something, ask:

> Does this help the user manage budget, tasks, vendors, or the wedding through Eve?

If no, leave it out.
