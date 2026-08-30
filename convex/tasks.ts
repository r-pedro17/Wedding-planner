import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { taskStatus } from "./schema";
import { requireMembership } from "./lib/auth";
import { assertDateOnly, dueState } from "./lib/dates";
import { requireWeddingVendor } from "./lib/vendors";
import { taskWithDueState } from "./lib/validators";

export const list = query({
  args: { weddingId: v.id("weddings"), status: v.optional(taskStatus) },
  returns: v.array(taskWithDueState),
  handler: async (ctx, { weddingId, status }) => {
    await requireMembership(ctx, weddingId);
    const rows = status
      ? await ctx.db
          .query("tasks")
          .withIndex("by_wedding_and_status", (q) => q.eq("weddingId", weddingId).eq("status", status))
          .collect()
      : await ctx.db
          .query("tasks")
          .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
          .collect();

    return rows
      .map((task) => ({ ...task, dueState: dueState(task.dueDate) }))
      .sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31"));
  },
});

export const create = mutation({
  args: {
    weddingId: v.id("weddings"),
    title: v.string(),
    notes: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    owner: v.optional(v.string()),
    status: v.optional(taskStatus),
    vendorId: v.optional(v.id("vendors")),
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.weddingId);
    await requireWeddingVendor(ctx, args.vendorId, args.weddingId);
    if (args.dueDate) assertDateOnly(args.dueDate, "dueDate");
    if (args.title.trim() === "") throw new Error("Task title is required");
    return await ctx.db.insert("tasks", { ...args, status: args.status ?? "todo" });
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    owner: v.optional(v.string()),
    status: v.optional(taskStatus),
    vendorId: v.optional(v.id("vendors")),
  },
  returns: v.id("tasks"),
  handler: async (ctx, { taskId, ...patch }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");
    await requireMembership(ctx, task.weddingId);
    await requireWeddingVendor(ctx, patch.vendorId, task.weddingId);
    if (patch.dueDate) assertDateOnly(patch.dueDate, "dueDate");
    await ctx.db.patch(taskId, patch);
    return taskId;
  },
});

export const complete = mutation({
  args: { taskId: v.id("tasks") },
  returns: v.id("tasks"),
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");
    await requireMembership(ctx, task.weddingId);
    await ctx.db.patch(taskId, { status: "done" });
    return taskId;
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return;
    await requireMembership(ctx, task.weddingId);
    await ctx.db.delete(taskId);
  },
});
