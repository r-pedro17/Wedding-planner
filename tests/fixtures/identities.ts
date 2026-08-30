import { convexTest } from "convex-test";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

export const OWNER_SUBJECT = "fixture-owner";
export const PARTNER_SUBJECT = "fixture-partner";
export const OUTSIDER_SUBJECT = "fixture-outsider";

export const NOT_SIGNED_IN = "Not signed in";
export const NO_ACCESS = "You do not have access to this wedding";
export const WRONG_WEDDING_VENDOR = "Vendor does not belong to this wedding";
export const NOT_OWNER = "Only the wedding owner can do this";

export type Fixture = {
  t: ReturnType<typeof convexTest>;
  anonymous: ReturnType<typeof convexTest>;
  owner: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>;
  partner: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>;
  outsider: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>;
  weddingId: Id<"weddings">;
  otherWeddingId: Id<"weddings">;
};

/**
 * Seeds the four-identity fixture shared by the authorization matrix suite:
 * an anonymous caller, an owner and partner on wedding A, and an outsider who
 * is a real signed-in user but only belongs to a separate wedding B.
 */
export async function seedFixture(): Promise<Fixture> {
  const t = convexTest(schema, modules);

  const weddingId = await t.run(async (ctx) => {
    return await ctx.db.insert("weddings", {
      name: "Fixture wedding A",
      currency: "EUR",
      totalBudgetCents: 2_000_000,
    });
  });

  // The outsider owns their own wedding so they are a genuine signed-in user,
  // not merely an unrecognized subject.
  const otherWeddingId = await t.run(async (ctx) => {
    return await ctx.db.insert("weddings", {
      name: "Fixture wedding B",
      currency: "EUR",
      totalBudgetCents: 1_500_000,
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("memberships", {
      weddingId,
      clerkUserId: OWNER_SUBJECT,
      role: "owner",
    });
    await ctx.db.insert("memberships", {
      weddingId,
      clerkUserId: PARTNER_SUBJECT,
      role: "partner",
    });
    await ctx.db.insert("memberships", {
      weddingId: otherWeddingId,
      clerkUserId: OUTSIDER_SUBJECT,
      role: "owner",
    });
  });

  // The bare handle carries no identity, so it *is* the anonymous caller. It
  // must be the same instance as `t` or anonymous calls would hit an empty database.
  const anonymous = t;
  const owner = t.withIdentity({ subject: OWNER_SUBJECT });
  const partner = t.withIdentity({ subject: PARTNER_SUBJECT });
  const outsider = t.withIdentity({ subject: OUTSIDER_SUBJECT });

  return { t, anonymous, owner, partner, outsider, weddingId, otherWeddingId };
}
