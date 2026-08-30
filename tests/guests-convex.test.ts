import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

async function seedWedding(t: ReturnType<typeof convexTest>, ownerId: string, name = "Our wedding") {
  return await t.run(async (ctx) => {
    const weddingId = await ctx.db.insert("weddings", {
      name,
      currency: "EUR",
      totalBudgetCents: 2_000_000,
    });
    await ctx.db.insert("memberships", { weddingId, clerkUserId: ownerId, role: "owner" });
    return weddingId;
  });
}

describe("guests Convex API", () => {
  it("allows a member to manage invitations and derives headcount", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "owner" });
    const weddingId = await seedWedding(t, "owner");

    const firstId = await owner.mutation(api.guests.create, {
      weddingId,
      name: "  Ada and Sam  ",
      partySize: 2,
      notes: "  cousins  ",
    });
    const secondId = await owner.mutation(api.guests.create, {
      weddingId,
      name: "Bea",
      partySize: 1,
    });

    expect(await owner.query(api.guests.list, { weddingId })).toMatchObject({
      totalHeadcount: 3,
      guests: [
        { _id: firstId, name: "Ada and Sam", partySize: 2, notes: "cousins" },
        { _id: secondId, name: "Bea", partySize: 1 },
      ],
    });

    await owner.mutation(api.guests.update, {
      guestId: firstId,
      name: "Ada and Sam",
      partySize: 4,
      notes: "family",
    });
    expect((await owner.query(api.guests.list, { weddingId })).totalHeadcount).toBe(5);

    await owner.mutation(api.guests.remove, { guestId: secondId });
    expect(await owner.query(api.guests.list, { weddingId })).toMatchObject({
      totalHeadcount: 4,
      guests: [{ _id: firstId, partySize: 4 }],
    });
  });

  it("rejects unauthenticated reads and writes", async () => {
    const t = convexTest(schema, modules);
    const weddingId = await seedWedding(t, "owner");
    const guestId = await t.run((ctx) =>
      ctx.db.insert("guests", { weddingId, name: "Ada", partySize: 1 }),
    );

    await expect(t.query(api.guests.list, { weddingId })).rejects.toThrow("Not signed in");
    await expect(t.mutation(api.guests.create, { weddingId, name: "Bea", partySize: 1 })).rejects.toThrow(
      "Not signed in",
    );
    await expect(
      t.mutation(api.guests.update, { guestId, name: "Ada", partySize: 2 }),
    ).rejects.toThrow("Not signed in");
    await expect(t.mutation(api.guests.remove, { guestId })).rejects.toThrow("Not signed in");
  });

  it("isolates every guest operation between weddings", async () => {
    const t = convexTest(schema, modules);
    const firstWeddingId = await seedWedding(t, "first-owner", "First wedding");
    await seedWedding(t, "other-owner", "Other wedding");
    const firstOwner = t.withIdentity({ subject: "first-owner" });
    const outsider = t.withIdentity({ subject: "other-owner" });
    const guestId = await firstOwner.mutation(api.guests.create, {
      weddingId: firstWeddingId,
      name: "Ada",
      partySize: 2,
    });

    await expect(outsider.query(api.guests.list, { weddingId: firstWeddingId })).rejects.toThrow(
      "You do not have access",
    );
    await expect(
      outsider.mutation(api.guests.create, { weddingId: firstWeddingId, name: "Injected", partySize: 1 }),
    ).rejects.toThrow("You do not have access");
    await expect(
      outsider.mutation(api.guests.update, { guestId, name: "Changed", partySize: 9 }),
    ).rejects.toThrow("You do not have access");
    await expect(outsider.mutation(api.guests.remove, { guestId })).rejects.toThrow("You do not have access");

    expect(await firstOwner.query(api.guests.list, { weddingId: firstWeddingId })).toMatchObject({
      totalHeadcount: 2,
      guests: [{ _id: guestId, name: "Ada", partySize: 2 }],
    });
  });
});
