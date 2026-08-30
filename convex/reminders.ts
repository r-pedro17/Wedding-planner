import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { isDueWithin, dueState, today } from "./lib/dates";
import { remainingCents } from "./lib/budget";
import { formatCents } from "./lib/money";
import { reminderDoc } from "./lib/validators";

/** Open reminders for the dashboard. */
export const list = query({
  args: { weddingId: v.id("weddings") },
  returns: v.array(reminderDoc),
  handler: async (ctx, { weddingId }) => {
    await requireMembership(ctx, weddingId);
    const rows = await ctx.db
      .query("reminders")
      .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
      .collect();
    return rows
      .filter((r) => r.dismissedAt === undefined)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
});

export const dismiss = mutation({
  args: { reminderId: v.id("reminders") },
  returns: v.null(),
  handler: async (ctx, { reminderId }) => {
    const reminder = await ctx.db.get(reminderId);
    if (!reminder) return;
    await requireMembership(ctx, reminder.weddingId);
    await ctx.db.patch(reminderId, { dismissedAt: Date.now() });
  },
});

/**
 * Rebuild reminders for every wedding: one per payment or task due inside the
 * window. Keyed on the subject row so a re-run never duplicates a reminder.
 * Called by `crons.ts`; not reachable from the client.
 */
export const refreshAll = internalMutation({
  args: { withinDays: v.optional(v.number()) },
  returns: v.object({ created: v.number() }),
  handler: async (ctx, { withinDays }) => {
    const days = withinDays ?? 14;
    const from = today();
    const weddings = await ctx.db.query("weddings").collect();
    let created = 0;

    for (const wedding of weddings) {
      const existing = await ctx.db
        .query("reminders")
        .withIndex("by_wedding", (q) => q.eq("weddingId", wedding._id))
        .collect();
      const seen = new Set(existing.map((r) => r.subjectId));

      const items = await ctx.db
        .query("budgetItems")
        .withIndex("by_wedding", (q) => q.eq("weddingId", wedding._id))
        .collect();
      for (const item of items) {
        if (seen.has(item._id) || remainingCents(item) === 0 || !item.dueDate) continue;
        const state = dueState(item.dueDate, from);
        if (state !== "overdue" && !isDueWithin(item.dueDate, days, from)) continue;
        await ctx.db.insert("reminders", {
          weddingId: wedding._id,
          kind: "payment_due",
          subjectId: item._id,
          dueDate: item.dueDate,
          message: `${formatCents(remainingCents(item), wedding.currency)} still owed on ${item.name}, due ${item.dueDate}.`,
        });
        created += 1;
      }

      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_wedding", (q) => q.eq("weddingId", wedding._id))
        .collect();
      for (const task of tasks) {
        if (seen.has(task._id) || task.status === "done" || !task.dueDate) continue;
        const state = dueState(task.dueDate, from);
        if (state !== "overdue" && !isDueWithin(task.dueDate, days, from)) continue;
        await ctx.db.insert("reminders", {
          weddingId: wedding._id,
          kind: "task_due",
          subjectId: task._id,
          dueDate: task.dueDate,
          message: `${task.title} is due ${task.dueDate}.`,
        });
        created += 1;
      }
    }
    return { created };
  },
});

/** Drop reminders whose subject is gone, paid, or completed. */
export const pruneResolved = internalMutation({
  args: {},
  returns: v.object({ removed: v.number() }),
  handler: async (ctx) => {
    const reminders = await ctx.db.query("reminders").collect();
    let removed = 0;
    for (const reminder of reminders) {
      let resolved: boolean;
      if (reminder.kind === "payment_due") {
        const itemId = ctx.db.normalizeId("budgetItems", reminder.subjectId);
        const item = itemId ? await ctx.db.get(itemId) : null;
        resolved = item === null || remainingCents(item) === 0;
      } else {
        const taskId = ctx.db.normalizeId("tasks", reminder.subjectId);
        const task = taskId ? await ctx.db.get(taskId) : null;
        resolved = task === null || task.status === "done";
      }
      if (resolved) {
        await ctx.db.delete(reminder._id);
        removed += 1;
      }
    }
    return { removed };
  },
});
