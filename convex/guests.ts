import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { MAX_GUEST_PARTIES, normalizeGuest, totalHeadcount } from "./lib/guests";

const guestDoc = v.object({
  _id: v.id("guests"),
  _creationTime: v.number(),
  weddingId: v.id("weddings"),
  name: v.string(),
  partySize: v.number(),
  notes: v.optional(v.string()),
});

export const list = query({
  args: { weddingId: v.id("weddings") },
  returns: v.object({ guests: v.array(guestDoc), totalHeadcount: v.number() }),
  handler: async (ctx, { weddingId }) => {
    await requireMembership(ctx, weddingId);
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
      .take(MAX_GUEST_PARTIES);
    guests.sort((a, b) => a.name.localeCompare(b.name));
    return { guests, totalHeadcount: totalHeadcount(guests) };
  },
});

export const create = mutation({
  args: {
    weddingId: v.id("weddings"),
    name: v.string(),
    partySize: v.number(),
    notes: v.optional(v.string()),
  },
  returns: v.id("guests"),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.weddingId);
    const existing = await ctx.db
      .query("guests")
      .withIndex("by_wedding", (q) => q.eq("weddingId", args.weddingId))
      .take(MAX_GUEST_PARTIES);
    if (existing.length >= MAX_GUEST_PARTIES) throw new Error("Guest list limit reached");
    const guest = normalizeGuest(args);
    return await ctx.db.insert("guests", { weddingId: args.weddingId, ...guest });
  },
});

export const update = mutation({
  args: {
    guestId: v.id("guests"),
    name: v.string(),
    partySize: v.number(),
    notes: v.optional(v.string()),
  },
  returns: v.id("guests"),
  handler: async (ctx, { guestId, ...input }) => {
    const current = await ctx.db.get(guestId);
    if (!current) throw new Error("Guest not found");
    await requireMembership(ctx, current.weddingId);
    await ctx.db.patch(guestId, normalizeGuest(input));
    return guestId;
  },
});

export const remove = mutation({
  args: { guestId: v.id("guests") },
  returns: v.null(),
  handler: async (ctx, { guestId }) => {
    const guest = await ctx.db.get(guestId);
    if (!guest) return null;
    await requireMembership(ctx, guest.weddingId);
    await ctx.db.delete(guestId);
    return null;
  },
});
