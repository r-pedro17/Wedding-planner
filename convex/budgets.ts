import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { budgetItemStatus } from "./schema";
import { requireMembership } from "./lib/auth";
import { recordUserEvent } from "./lib/audit";
import { computeTotals, byCategory, remainingCents, upcomingPayments } from "./lib/budget";
import { assertDateOnly } from "./lib/dates";
import { assertNonNegativeCents } from "./lib/money";
import { requireWeddingVendor } from "./lib/vendors";
import {
  budgetCategoryDoc,
  budgetItemDoc,
  budgetItemWithRemaining,
  budgetTotals,
} from "./lib/validators";

export const list = query({
  args: { weddingId: v.id("weddings") },
  returns: v.object({
    currency: v.string(),
    items: v.array(budgetItemWithRemaining),
    totals: budgetTotals,
    categories: v.record(v.string(), budgetTotals),
  }),
  handler: async (ctx, { weddingId }) => {
    await requireMembership(ctx, weddingId);
    const wedding = await ctx.db.get(weddingId);
    if (!wedding) throw new Error("Wedding not found");
    const items = await ctx.db
      .query("budgetItems")
      .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
      .collect();
    return {
      currency: wedding.currency,
      items: items.map((item) => ({ ...item, remainingCents: remainingCents(item) })),
      totals: computeTotals(items, wedding.totalBudgetCents),
      categories: byCategory(items),
    };
  },
});

export const upcoming = query({
  args: { weddingId: v.id("weddings"), days: v.optional(v.number()) },
  returns: v.array(budgetItemDoc),
  handler: async (ctx, { weddingId, days }) => {
    await requireMembership(ctx, weddingId);
    const items = await ctx.db
      .query("budgetItems")
      .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
      .collect();
    return upcomingPayments(items, days ?? 30);
  },
});

export const categories = query({
  args: { weddingId: v.id("weddings") },
  returns: v.array(budgetCategoryDoc),
  handler: async (ctx, { weddingId }) => {
    await requireMembership(ctx, weddingId);
    return await ctx.db
      .query("budgetCategories")
      .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
      .collect();
  },
});

export const addCategory = mutation({
  args: { weddingId: v.id("weddings"), name: v.string() },
  returns: v.id("budgetCategories"),
  handler: async (ctx, { weddingId, name }) => {
    const { clerkUserId } = await requireMembership(ctx, weddingId);
    const categoryId = await ctx.db.insert("budgetCategories", { weddingId, name });
    await recordUserEvent(ctx, {
      weddingId,
      actorId: clerkUserId,
      action: "create",
      entity: "budgetCategory",
      entityId: categoryId,
    });
    return categoryId;
  },
});

export const addItem = mutation({
  args: {
    weddingId: v.id("weddings"),
    name: v.string(),
    category: v.string(),
    plannedCents: v.number(),
    quotedCents: v.optional(v.number()),
    committedCents: v.optional(v.number()),
    paidCents: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    vendorId: v.optional(v.id("vendors")),
    status: v.optional(budgetItemStatus),
    notes: v.optional(v.string()),
  },
  returns: v.id("budgetItems"),
  handler: async (ctx, args) => {
    const { clerkUserId } = await requireMembership(ctx, args.weddingId);
    await requireWeddingVendor(ctx, args.vendorId, args.weddingId);
    if (args.dueDate) assertDateOnly(args.dueDate, "dueDate");
    assertNonNegativeCents(args.plannedCents, "plannedCents");
    if (args.quotedCents !== undefined) assertNonNegativeCents(args.quotedCents, "quotedCents");
    if (args.committedCents !== undefined) assertNonNegativeCents(args.committedCents, "committedCents");
    const paidCents = assertNonNegativeCents(args.paidCents ?? 0, "paidCents");

    const itemId = await ctx.db.insert("budgetItems", {
      ...args,
      paidCents,
      status: args.status ?? "idea",
    });
    await recordUserEvent(ctx, {
      weddingId: args.weddingId,
      actorId: clerkUserId,
      action: "create",
      entity: "budgetItem",
      entityId: itemId,
    });
    return itemId;
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("budgetItems"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    plannedCents: v.optional(v.number()),
    quotedCents: v.optional(v.number()),
    committedCents: v.optional(v.number()),
    paidCents: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    vendorId: v.optional(v.id("vendors")),
    status: v.optional(budgetItemStatus),
    notes: v.optional(v.string()),
  },
  returns: v.id("budgetItems"),
  handler: async (ctx, { itemId, ...patch }) => {
    const item = await ctx.db.get(itemId);
    if (!item) throw new Error("Budget item not found");
    const { clerkUserId } = await requireMembership(ctx, item.weddingId);
    await requireWeddingVendor(ctx, patch.vendorId, item.weddingId);
    if (patch.dueDate) assertDateOnly(patch.dueDate, "dueDate");
    for (const field of ["plannedCents", "quotedCents", "committedCents", "paidCents"] as const) {
      const value = patch[field];
      if (value !== undefined) assertNonNegativeCents(value, field);
    }
    await ctx.db.patch(itemId, patch);
    await recordUserEvent(ctx, {
      weddingId: item.weddingId,
      actorId: clerkUserId,
      action: "update",
      entity: "budgetItem",
      entityId: itemId,
    });
    return itemId;
  },
});

/** Record a payment against an item. Amounts add up; totals stay derived. */
export const recordPayment = mutation({
  args: { itemId: v.id("budgetItems"), amountCents: v.number() },
  returns: v.object({ itemId: v.id("budgetItems"), paidCents: v.number() }),
  handler: async (ctx, { itemId, amountCents }) => {
    const item = await ctx.db.get(itemId);
    if (!item) throw new Error("Budget item not found");
    const { clerkUserId } = await requireMembership(ctx, item.weddingId);
    assertNonNegativeCents(amountCents, "amountCents");
    const paidCents = item.paidCents + amountCents;
    const owed = item.committedCents ?? item.plannedCents;
    await ctx.db.patch(itemId, {
      paidCents,
      status: paidCents >= owed ? "paid" : item.status === "idea" ? "booked" : item.status,
    });
    await recordUserEvent(ctx, {
      weddingId: item.weddingId,
      actorId: clerkUserId,
      action: "payment",
      entity: "budgetItem",
      entityId: itemId,
    });
    return { itemId, paidCents };
  },
});

export const removeItem = mutation({
  args: { itemId: v.id("budgetItems") },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item) return;
    const { clerkUserId } = await requireMembership(ctx, item.weddingId);
    await ctx.db.delete(itemId);
    await recordUserEvent(ctx, {
      weddingId: item.weddingId,
      actorId: clerkUserId,
      action: "delete",
      entity: "budgetItem",
      entityId: itemId,
    });
  },
});
