import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  currentUserId,
  currentWeddingId,
  requireMembership,
  requireOwner,
  requireUserId,
} from "./lib/auth";
import { computeTotals, upcomingPayments } from "./lib/budget";
import { daysBetween, dueState, today } from "./lib/dates";

/** The wedding for the signed-in user, or null when signed out / not set up. */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const weddingId = await currentWeddingId(ctx);
    if (!weddingId) return null;
    const wedding = await ctx.db.get(weddingId);
    if (!wedding) return null;
    return { ...wedding, daysUntil: wedding.weddingDate ? daysBetween(today(), wedding.weddingDate) : null };
  },
});

/** Everything the dashboard needs, in one read. */
export const summary = query({
  args: { weddingId: v.id("weddings") },
  handler: async (ctx, { weddingId }) => {
    await requireMembership(ctx, weddingId);
    const wedding = await ctx.db.get(weddingId);
    if (!wedding) throw new Error("Wedding not found");

    const items = await ctx.db
      .query("budgetItems")
      .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
      .collect();
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
      .collect();
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
      .collect();

    const openTasks = tasks.filter((t) => t.status !== "done");
    return {
      wedding: {
        ...wedding,
        daysUntil: wedding.weddingDate ? daysBetween(today(), wedding.weddingDate) : null,
      },
      totals: computeTotals(items, wedding.totalBudgetCents),
      upcomingPayments: upcomingPayments(items, 30).slice(0, 5),
      upcomingTasks: openTasks
        .filter((t) => dueState(t.dueDate) !== "none")
        .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
        .slice(0, 5),
      counts: {
        openTasks: openTasks.length,
        overdueTasks: openTasks.filter((t) => dueState(t.dueDate) === "overdue").length,
        vendorsBooked: vendors.filter((vd) => vd.status === "booked").length,
        vendorsTotal: vendors.length,
      },
    };
  },
});

/** Create the couple's wedding and make the creator its owner. */
export const create = mutation({
  args: {
    name: v.string(),
    weddingDate: v.optional(v.string()),
    currency: v.optional(v.string()),
    totalBudgetCents: v.number(),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireUserId(ctx);
    const weddingId = await ctx.db.insert("weddings", {
      name: args.name,
      weddingDate: args.weddingDate,
      currency: args.currency ?? "EUR",
      totalBudgetCents: args.totalBudgetCents,
    });
    await ctx.db.insert("memberships", { weddingId, clerkUserId, role: "owner" });
    return weddingId;
  },
});

export const update = mutation({
  args: {
    weddingId: v.id("weddings"),
    name: v.optional(v.string()),
    weddingDate: v.optional(v.string()),
    totalBudgetCents: v.optional(v.number()),
  },
  handler: async (ctx, { weddingId, ...patch }) => {
    await requireMembership(ctx, weddingId);
    await ctx.db.patch(weddingId, patch);
  },
});

export const members = query({
  args: { weddingId: v.id("weddings") },
  handler: async (ctx, { weddingId }) => {
    await requireMembership(ctx, weddingId);
    return await ctx.db
      .query("memberships")
      .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
      .collect();
  },
});

/**
 * Add a partner by Clerk user id. Owner-only: both roles can manage wedding
 * data in V1, but only the owner decides who is in the wedding.
 */
export const addMember = mutation({
  args: { weddingId: v.id("weddings"), clerkUserId: v.string() },
  handler: async (ctx, { weddingId, clerkUserId }) => {
    await requireOwner(ctx, weddingId);
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user_and_wedding", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("weddingId", weddingId),
      )
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("memberships", { weddingId, clerkUserId, role: "partner" });
  },
});

/** Keeps a `users` row in sync so the UI can show names. */
export const ensureUser = mutation({
  args: { name: v.optional(v.string()), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const clerkUserId = await currentUserId(ctx);
    if (!clerkUserId) return null;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("users", { clerkUserId, ...args });
  },
});
