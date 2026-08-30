# Wedding Planner — Product Specification

## 1. Product shape

The app is a small wedding control center.

```text
WEDDING APP
│
├── Dashboard
├── Budget
├── Planner
├── Guests
└── Eve
     │
     └── reads and changes the same Convex data as the UI
```

The product should feel calm and obvious. A user should not need to understand databases, accounting, project management, or AI agents.

---

## 2. Dashboard

The dashboard answers five questions immediately:

1. When is the wedding?
2. How many days are left?
3. How much money is left?
4. What payments are coming up?
5. What tasks need attention?

### Minimum dashboard sections

- Wedding date and countdown.
- Budget summary.
- Upcoming payments.
- Upcoming tasks.
- Eve entry point.

Avoid building a configurable analytics dashboard.

---

## 3. Budget

The budget must stay deliberately simple.

### Budget item

Each budget item should support:

- Name.
- Category.
- Planned amount.
- Quoted amount.
- Committed amount.
- Paid amount.
- Due date.
- Vendor.
- Status.
- Optional notes.

Example:

```text
Photography

Planned:      €2,000
Quoted:       €1,850
Committed:    €1,850
Paid:           €500
Remaining:    €1,350
Due:          10 May
Vendor:       Jane Photography
Status:       Booked
```

### Budget totals

Show at minimum:

- Total wedding budget.
- Total planned.
- Total committed.
- Total paid.
- Available/unallocated amount.

Calculated values should come from stored structured data. Do not let the AI calculate and persist totals independently.

---

## 4. Planner

The planner is a lightweight task system, not a project-management suite.

### Task fields

- Title.
- Description or notes.
- Due date.
- Owner.
- Status.
- Optional vendor link.

### Required statuses

Keep the initial status model small:

- To do.
- In progress.
- Done.

No Kanban customization, dependencies, epics, sprints, points, or workflow builders in V1.

---

## 5. Vendors

A vendor is a simple record used by both budget items and tasks.

### Vendor fields

- Name.
- Category/type.
- Contact name.
- Email.
- Phone.
- Website.
- Notes.
- Status.

Do not build a marketplace or vendor discovery system in V1.

---

## 6. Guests

The guest list answers one deliberately narrow question: how many people are we planning for?

Each invitation-party record stores a person or household name, a positive whole-number party size, and optional notes. The screen shows the total planned headcount and supports add, edit, and confirmed removal. RSVP tracking, contact management, invitation sending or delivery, meal choices, and seating remain out of scope.

---

## 7. Eve

Eve is the operator layer over the app.

Eve should be able to answer questions such as:

- "How much money do we have left?"
- "What is due this month?"
- "What should we do next?"
- "How much have we already paid?"
- "Which vendors are still not booked?"

Eve should also handle commands such as:

- "Add photographer, €1,800. We paid €500 and the rest is due May 10."
- "Add a task to choose flowers by March 12."
- "Mark the venue deposit as paid."
- "Change the florist quote to €950."

### Eve architecture rule

```text
User
  ↓ authenticated as that user
Clerk
  ↓
Eve
  ↓
Controlled tools
  ↓
Convex
  ↑
UI
```

Eve never writes directly to hidden memory and treats that as wedding state.
Eve acts with the signed-in person's short-lived delegated identity. It is not a
separate wedding member and does not use a permanent couple token. Convex still
decides whether that person belongs to the wedding.

### Eve tool surface

Start with a small explicit tool set:

```text
getWeddingSummary
getBudget
addBudgetItem
updateBudgetItem
getTasks
createTask
updateTask
completeTask
getVendors
addVendor
updateVendor
```

Add tools only when the user workflow requires them.

### Approval rule

For destructive or significant changes, Eve should summarize the intended change before committing it.

Examples:

- Deleting a vendor.
- Deleting a budget item.
- Large budget changes.
- Bulk changes.

Simple low-risk additions and corrections can be direct if the interaction remains obvious and reversible.

---

## 8. Data ownership

Convex is the source of truth.

Suggested collections:

```text
users
weddings
memberships
budgetCategories
budgetItems
tasks
vendors
guests
auditEvents
```

### Relationship overview

```text
wedding
├── memberships
├── budgetCategories
│    └── budgetItems
├── tasks
├── vendors
├── guests
└── auditEvents
```

Every wedding-owned record should include `weddingId`.

---

## 9. Authentication and sharing

Use Clerk for authentication.

A wedding can have more than one member. V1 only needs a simple couple/shared access model.

Do not build a complex organization/role system.

Minimum membership roles:

- Owner.
- Partner.

Both can manage normal wedding data in V1.

The owner adds one partner through a normal invitation flow, such as an
expiring single-use email link or invite code. The user must not need to find or
paste a provider-specific Clerk user id. Advanced roles and organizations remain
out of scope.

---

## 10. Activity history

Important successful changes create a small, immutable activity record. It
identifies who acted, whether the change came through the normal UI or Eve, the
kind of action, and the affected record. It does not copy prompts, notes,
contacts, amounts, or full before/after values.

Activity history is wedding-scoped and protected by the same membership checks
as the rest of the app. A complex activity-management screen is not required for
V1; the durable record and its security proof are required.

---

## 11. Suggested repository shape

```text
wedding/
├── app/
│   ├── dashboard/
│   ├── budget/
│   ├── planner/
│   ├── guests/
│   └── settings/
│
├── components/
│   ├── ui/
│   ├── budget/
│   ├── planner/
│   ├── guests/
│   └── eve/
│
├── convex/
│   ├── schema.ts
│   ├── weddings.ts
│   ├── budgets.ts
│   ├── tasks.ts
│   ├── vendors.ts
│   ├── guests.ts
│   └── auditEvents.ts
│
├── agent/
│   ├── instructions.md
│   ├── tools/
│   │   ├── wedding.ts
│   │   ├── budget.ts
│   │   ├── planner.ts
│   │   └── vendors.ts
│   └── skills/
│       ├── wedding-planner.md
│       └── budget-advisor.md
│
└── tests/
```

The exact folders may change to match the frameworks, but preserve the separation of:

- UI.
- Convex/domain logic.
- Eve instructions.
- Eve tools.
- Tests.

---

## 12. UX rules

1. Mobile-friendly from the beginning.
2. Large obvious controls.
3. Minimal forms.
4. Prefer inline editing where it is clearer.
5. Always show money in a consistent currency.
6. Never make the user calculate totals manually.
7. Important dates should be visible without opening multiple screens.
8. Eve should be available from every important screen.
9. The app must still work without using Eve.
10. Do not hide core state inside chat.

---

## 13. Quality rules

Every important feature must have a simple proof that it works.

Examples:

- Create budget item → refresh → item still exists.
- Mark payment paid → totals change correctly.
- Create task through Eve → task appears in Planner.
- Change budget item through UI → Eve reports the new value.
- Partner opens wedding → sees same data.
- Add or edit an invitation → total headcount updates; another wedding cannot read or change it.
- Eve change → attributed to the signed-in person with Eve as the source.
- Unrelated authenticated user → cannot read or change the wedding.
- Backup snapshot → restored into an isolated deployment with relationships intact.

Do not accept a feature because the UI renders. Test the complete user path.
