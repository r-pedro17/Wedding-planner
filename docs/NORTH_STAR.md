# Wedding Planner — North Star

## What we are building

A simple wedding planning app that replaces Excel and scattered notes.

The app has five things:

1. A dashboard that shows what matters now.
2. A simple wedding budget.
3. A planner for tasks, deadlines, and vendors.
4. A guest list that keeps the planned headcount visible.
5. Eve sitting on top so the user can manage the wedding by talking to the app.

## North Star

> Open the app and immediately know what needs attention, what the wedding costs, and what to do next. Eve handles the administration.

## Primary user test

The product succeeds when a non-technical user prefers using it over Excel.

## V1 scope

V1 is one complete vertical slice. Do not split it into separate releases.

V1 includes:

- Sign in.
- Create or open one wedding.
- Wedding date.
- Total budget.
- Shared access for the couple.
- Dashboard.
- Budget categories and items.
- Planned, quoted, committed, and paid amounts.
- Payment due dates.
- Tasks and deadlines.
- Task owner and status.
- Vendors.
- A simple invitation list with household/guest name, party size, notes, and total headcount.
- Eve chat.
- Eve can read the wedding state.
- Eve can add and update tasks.
- Eve can add and update budget items.
- Eve can add and update vendors.
- Eve can answer questions such as "How much money do we have left?" and "What should we do next?"

## Explicitly not in V1

Do not build these unless the scope is deliberately changed:

- RSVPs.
- Seating charts.
- Wedding website.
- Registry.
- Vendor marketplace.
- Inspiration boards.
- AI image generation.
- Payments.
- Native mobile apps.
- Autonomous vendor research.
- Email inbox processing.
- Proactive scheduled Eve reminders.

## Product rules

1. Convex is the source of truth.
2. Eve never owns wedding data.
3. The UI and Eve both use the same underlying data.
4. Every important write must be deterministic and auditable.
5. Keep the interface simpler than a spreadsheet.
6. Do not add infrastructure until the current stack cannot solve the problem cleanly.
7. Prefer one obvious workflow over many configurable workflows.
8. Important changes are attributable to the authenticated person, including changes made through Eve.
9. Private wedding data must be isolated, observable without being copied into logs, and recoverable from a tested backup.

## Stack

- Next.js + TypeScript
- Vercel
- Tailwind CSS
- shadcn/ui
- Convex
- Clerk
- Eve
- Vercel AI Gateway
- Convex File Storage if files are needed
- Axiom for privacy-minimal application and Eve observability

## Definition of done

V1 is done when a user can:

1. Sign in.
2. Open the wedding dashboard.
3. See the wedding date and days remaining.
4. See current budget totals.
5. Add and edit budget items.
6. Mark money as planned, quoted, committed, or paid.
7. Add tasks and deadlines.
8. Add vendors.
9. Add, edit, and remove invitations and see the planned headcount.
10. Ask Eve about the wedding.
11. Ask Eve to change wedding data and see the UI update immediately.
12. Refresh or reopen the app and see the same correct state.
13. Share the wedding with a partner without exchanging provider-specific user ids.
14. Prevent an unrelated signed-in user from reading or changing the wedding.
15. Have Eve act only with the signed-in person's authority and attribute its changes to that person.
16. Recover the wedding from a successfully tested backup.
