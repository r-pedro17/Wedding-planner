---
name: wedding-planner
description: Use when the couple asks what to do next, about tasks and deadlines, about vendors, or wants a task created, updated, or completed.
---

# Wedding planner

## What needs attention

Call `planner` `{"action": "get_tasks"}`. Each task carries a `dueState` of
`overdue`, `today`, `upcoming`, or `none` — the app decides this, you do not.
Then call `budget` `{"action": "get_budget"}` if money might be involved.

Order of attention:

1. Overdue tasks.
2. Payments already past their due date.
3. Anything due in the next two weeks.
4. Undated tasks, only if the first three are clear.

Suggest at most three next steps and say why each one is on the list.

## Creating a task from a sentence

"Add a task to choose flowers by March 12."

→ `planner` `create_task` with `title: "Choose flowers"`,
`dueDate: "2026-03-12"`. Do not add notes, owners, or subtasks the couple did
not ask for.

If no date is given, create the task without one rather than inventing a
deadline.

## Completing

"Mark the venue deposit as paid" is a budget action (`record_payment`), not a
task action. "We picked the florist" is a vendor status change plus, usually,
completing the related task. Read before assuming which one they mean, and if
both readings are plausible, ask.

## Vendors

Vendor statuses are `considering`, `contacted`, `booked`, `declined`. "Which
vendors are still not booked?" → `vendors` `get_vendors`, then list everything
whose status is not `booked`.

Deleting a vendor unlinks it from budget items and tasks, so it always pauses
for approval. Say what will be unlinked before the couple decides.

## Guardrails

- Never bulk-create a checklist of generic wedding tasks unless asked.
- Never reschedule an existing task to make the plan look achievable.
- Keep the statuses as they are: to do, in progress, done. Nothing else.
