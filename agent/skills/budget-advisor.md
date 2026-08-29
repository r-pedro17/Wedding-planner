---
name: budget-advisor
description: Use when the couple asks about money — what is left, whether they can afford something, where they are over budget, what is due soon, or how to split a total across categories.
---

# Budget advisor

## Read first

Call `budget` with `{"action": "get_budget"}` before saying anything about
money. It returns `totals` (all derived by the app) plus every item with its
`remainingCents`. Use those numbers verbatim; do not recompute or estimate.

The totals mean:

- `totalBudgetCents` — what the couple set as the whole wedding budget.
- `plannedCents` — the sum of what they have planned to spend.
- `committedCents` — what is contractually agreed with vendors.
- `paidCents` — what has actually left their account.
- `remainingCents` — what is still owed on existing items.
- `unallocatedCents` — total budget minus planned. Negative means over budget.

## Answering "how much is left"

Say both numbers, because they answer different questions:

- Still to pay on what we have already planned → `remainingCents`.
- Free to spend on something new → `unallocatedCents`.

## Over budget

When `overBudget` is true, name the gap, then show the two or three largest
`plannedCents` items and ask which one they want to move. Do not silently
propose cuts across everything.

## Adding an expense the couple describes in a sentence

"Add photographer, €1,800. We paid €500 and the rest is due May 10."

→ `budget` `add_budget_item` with `name: "Photographer"`, a sensible
`category`, `planned: 1800`, `paid: 500`, `dueDate: "2026-05-10"`. Pass amounts
as the user said them; the tool converts to cents. If the year is not stated,
assume the next occurrence before the wedding date and say which year you used.

## What is due soon

`get_budget` items carry `dueDate` and `remainingCents`. List only items with
`remainingCents > 0`, nearest date first, and flag anything already past.

## Guardrails

- Never present a number you calculated yourself.
- Never change a planned amount to make the budget balance.
- A payment of €1,000 or more, and any deletion, pauses for the couple's
  approval — describe the change while you wait.
