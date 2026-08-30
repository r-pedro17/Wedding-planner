import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { vendorStatus } from "./schema";
import { requireMembership } from "./lib/auth";
import { vendorDoc } from "./lib/validators";

export const list = query({
  args: { weddingId: v.id("weddings") },
  returns: v.array(vendorDoc),
  handler: async (ctx, { weddingId }) => {
    await requireMembership(ctx, weddingId);
    return await ctx.db
      .query("vendors")
      .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
      .collect();
  },
});

export const add = mutation({
  args: {
    weddingId: v.id("weddings"),
    name: v.string(),
    category: v.string(),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(vendorStatus),
  },
  returns: v.id("vendors"),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.weddingId);
    if (args.name.trim() === "") throw new Error("Vendor name is required");
    return await ctx.db.insert("vendors", { ...args, status: args.status ?? "considering" });
  },
});

export const update = mutation({
  args: {
    vendorId: v.id("vendors"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(vendorStatus),
  },
  returns: v.id("vendors"),
  handler: async (ctx, { vendorId, ...patch }) => {
    const vendor = await ctx.db.get(vendorId);
    if (!vendor) throw new Error("Vendor not found");
    await requireMembership(ctx, vendor.weddingId);
    await ctx.db.patch(vendorId, patch);
    return vendorId;
  },
});

/** Deleting a vendor unlinks it from budget items and tasks rather than
 * orphaning ids. Eve must confirm this with the user before calling it. */
export const remove = mutation({
  args: { vendorId: v.id("vendors") },
  returns: v.null(),
  handler: async (ctx, { vendorId }) => {
    const vendor = await ctx.db.get(vendorId);
    if (!vendor) return;
    await requireMembership(ctx, vendor.weddingId);

    const items = await ctx.db
      .query("budgetItems")
      .withIndex("by_wedding", (q) => q.eq("weddingId", vendor.weddingId))
      .collect();
    for (const item of items.filter((i) => i.vendorId === vendorId)) {
      await ctx.db.patch(item._id, { vendorId: undefined });
    }
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_wedding", (q) => q.eq("weddingId", vendor.weddingId))
      .collect();
    for (const task of tasks.filter((t) => t.vendorId === vendorId)) {
      await ctx.db.patch(task._id, { vendorId: undefined });
    }
    await ctx.db.delete(vendorId);
  },
});
