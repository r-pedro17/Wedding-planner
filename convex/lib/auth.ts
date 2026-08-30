import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** The signed-in Clerk user id, or null when the request is anonymous. */
export async function currentUserId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const userId = await currentUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  return userId;
}

/**
 * Every wedding-scoped query and mutation must call this before touching data.
 */
export async function requireMembership(
  ctx: QueryCtx | MutationCtx,
  weddingId: Id<"weddings">,
) {
  const clerkUserId = await requireUserId(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_and_wedding", (q) =>
      q.eq("clerkUserId", clerkUserId).eq("weddingId", weddingId),
    )
    .unique();
  if (!membership) throw new Error("You do not have access to this wedding");
  return { clerkUserId, membership };
}

/**
 * Stricter than `requireMembership`: the caller must hold the owner role.
 * V1 gives both roles the run of the wedding's data, so this guards only the
 * membership list itself.
 */
export async function requireOwner(ctx: QueryCtx | MutationCtx, weddingId: Id<"weddings">) {
  const { clerkUserId, membership } = await requireMembership(ctx, weddingId);
  if (membership.role !== "owner") throw new Error("Only the wedding owner can do this");
  return { clerkUserId, membership };
}

/** The wedding the signed-in user belongs to, or null. V1 is one wedding. */
export async function currentWeddingId(ctx: QueryCtx | MutationCtx): Promise<Id<"weddings"> | null> {
  const clerkUserId = await currentUserId(ctx);
  if (!clerkUserId) return null;
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
    .first();
  return membership?.weddingId ?? null;
}
