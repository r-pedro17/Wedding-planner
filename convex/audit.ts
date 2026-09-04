import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { auditEventDoc } from "./lib/validators";

const MAX_AUDIT_ROWS = 200;

/**
 * The wedding's audit history, newest first. Member-gated like every other
 * wedding-scoped read. There is deliberately no mutation in this module (or
 * anywhere) to edit or delete a recorded event — history is append-only.
 */
export const list = query({
  args: { weddingId: v.id("weddings"), limit: v.optional(v.number()) },
  returns: v.array(auditEventDoc),
  handler: async (ctx, { weddingId, limit }) => {
    await requireMembership(ctx, weddingId);
    const take = Math.min(Math.max(limit ?? 50, 1), MAX_AUDIT_ROWS);
    return await ctx.db
      .query("auditEvents")
      .withIndex("by_wedding_and_time", (q) => q.eq("weddingId", weddingId))
      .order("desc")
      .take(take);
  },
});
