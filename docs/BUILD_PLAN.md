# Wedding Planner — Build Plan

## Goal

Build the complete V1 as one coherent vertical slice.

The app is only ready for handoff when Dashboard + Budget + Planner + Guests + Eve work together against persistent Convex data.

The sections below are build stages, not separate product releases.

## Current implementation status

As of August 2026, the application spine, authentication, persistent Convex
data, Dashboard, basic Budget, basic Planner, vendor records, couple sharing,
and a deliberately narrow guest headcount are implemented. Pure money, date,
budget, and guest validation logic has automated coverage, and
the production Next.js build passes.

The non-Eve UI is not yet a complete V1: budget items, tasks, and vendors do not
offer all documented edit/link fields; destructive UI actions need safer
confirmation and error handling; and Convex functions plus full browser flows do
not yet have automated coverage. Treat every unchecked proof point below as a
requirement to verify, not as a claim that it has passed. Eve exists in the repo
but remains outside the current stabilization pass.

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

# Stop conditions

Do not add new features while building V1 unless they are required to make the core flow usable.

If tempted to add something, ask:

> Does this help the user manage budget, tasks, vendors, or the wedding through Eve?

If no, leave it out.
