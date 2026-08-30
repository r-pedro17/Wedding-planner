import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import {
  NO_ACCESS,
  NOT_SIGNED_IN,
  WRONG_WEDDING_VENDOR,
  seedFixture,
} from "./fixtures/identities";
import type { Id } from "../convex/_generated/dataModel";

describe("budgets authorization", () => {
  it("list: enforces the four-identity matrix", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(anonymous.query(api.budgets.list, { weddingId })).rejects.toThrow(NOT_SIGNED_IN);
    await expect(owner.query(api.budgets.list, { weddingId })).resolves.toMatchObject({
      currency: "EUR",
    });
    await expect(partner.query(api.budgets.list, { weddingId })).resolves.toMatchObject({
      currency: "EUR",
    });
    await expect(outsider.query(api.budgets.list, { weddingId })).rejects.toThrow(NO_ACCESS);
  });

  it("upcoming: enforces the four-identity matrix", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(anonymous.query(api.budgets.upcoming, { weddingId })).rejects.toThrow(NOT_SIGNED_IN);
    await expect(owner.query(api.budgets.upcoming, { weddingId })).resolves.toEqual([]);
    await expect(partner.query(api.budgets.upcoming, { weddingId })).resolves.toEqual([]);
    await expect(outsider.query(api.budgets.upcoming, { weddingId })).rejects.toThrow(NO_ACCESS);
  });

  it("categories: enforces the four-identity matrix", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(anonymous.query(api.budgets.categories, { weddingId })).rejects.toThrow(NOT_SIGNED_IN);
    await expect(owner.query(api.budgets.categories, { weddingId })).resolves.toEqual([]);
    await expect(partner.query(api.budgets.categories, { weddingId })).resolves.toEqual([]);
    await expect(outsider.query(api.budgets.categories, { weddingId })).rejects.toThrow(NO_ACCESS);
  });

  it("addCategory: enforces the four-identity matrix", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(
      anonymous.mutation(api.budgets.addCategory, { weddingId, name: "Venue" }),
    ).rejects.toThrow(NOT_SIGNED_IN);
    await expect(
      owner.mutation(api.budgets.addCategory, { weddingId, name: "Venue" }),
    ).resolves.toBeDefined();
    await expect(
      partner.mutation(api.budgets.addCategory, { weddingId, name: "Catering" }),
    ).resolves.toBeDefined();
    await expect(
      outsider.mutation(api.budgets.addCategory, { weddingId, name: "Injected" }),
    ).rejects.toThrow(NO_ACCESS);
  });

  it("addItem: enforces the four-identity matrix and rejects cross-wedding vendorId", async () => {
    const { t, anonymous, owner, partner, outsider, weddingId, otherWeddingId } = await seedFixture();

    await expect(
      anonymous.mutation(api.budgets.addItem, {
        weddingId,
        name: "Flowers",
        category: "Decor",
        plannedCents: 10_000,
      }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    await expect(
      owner.mutation(api.budgets.addItem, {
        weddingId,
        name: "Flowers",
        category: "Decor",
        plannedCents: 10_000,
      }),
    ).resolves.toBeDefined();

    await expect(
      partner.mutation(api.budgets.addItem, {
        weddingId,
        name: "Cake",
        category: "Catering",
        plannedCents: 20_000,
      }),
    ).resolves.toBeDefined();

    await expect(
      outsider.mutation(api.budgets.addItem, {
        weddingId,
        name: "Injected",
        category: "Decor",
        plannedCents: 5_000,
      }),
    ).rejects.toThrow(NO_ACCESS);

    const otherVendorId: Id<"vendors"> = await t.run(async (ctx) => {
      return await ctx.db.insert("vendors", {
        weddingId: otherWeddingId,
        name: "Wedding B Florist",
        category: "Florist",
        status: "considering",
      });
    });

    await expect(
      owner.mutation(api.budgets.addItem, {
        weddingId,
        name: "Cross wedding vendor",
        category: "Decor",
        plannedCents: 5_000,
        vendorId: otherVendorId,
      }),
    ).rejects.toThrow(WRONG_WEDDING_VENDOR);
  });

  it("updateItem: enforces the four-identity matrix, leaves data unchanged on denial, and rejects cross-wedding vendorId", async () => {
    const { t, anonymous, owner, partner, outsider, weddingId, otherWeddingId } = await seedFixture();

    const itemId = await owner.mutation(api.budgets.addItem, {
      weddingId,
      name: "Flowers",
      category: "Decor",
      plannedCents: 10_000,
    });

    await expect(
      anonymous.mutation(api.budgets.updateItem, { itemId, name: "Renamed" }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    await expect(
      partner.mutation(api.budgets.updateItem, { itemId, name: "Renamed by partner" }),
    ).resolves.toBe(itemId);

    await expect(
      owner.mutation(api.budgets.updateItem, { itemId, plannedCents: 15_000 }),
    ).resolves.toBe(itemId);

    await expect(
      outsider.mutation(api.budgets.updateItem, { itemId, name: "Injected" }),
    ).rejects.toThrow(NO_ACCESS);

    const afterDenial = (await owner.query(api.budgets.list, { weddingId })).items.find(
      (item) => item._id === itemId,
    );
    expect(afterDenial).toMatchObject({ name: "Renamed by partner", plannedCents: 15_000 });

    const otherVendorId: Id<"vendors"> = await t.run(async (ctx) => {
      return await ctx.db.insert("vendors", {
        weddingId: otherWeddingId,
        name: "Wedding B Florist",
        category: "Florist",
        status: "considering",
      });
    });

    await expect(
      owner.mutation(api.budgets.updateItem, { itemId, vendorId: otherVendorId }),
    ).rejects.toThrow(WRONG_WEDDING_VENDOR);

    const afterVendorDenial = (await owner.query(api.budgets.list, { weddingId })).items.find(
      (item) => item._id === itemId,
    );
    expect(afterVendorDenial?.vendorId).toBeUndefined();
  });

  it("recordPayment: enforces the four-identity matrix and leaves data unchanged on denial", async () => {
    const { owner, partner, outsider, anonymous, weddingId } = await seedFixture();

    const itemId = await owner.mutation(api.budgets.addItem, {
      weddingId,
      name: "Flowers",
      category: "Decor",
      plannedCents: 10_000,
    });

    await expect(
      anonymous.mutation(api.budgets.recordPayment, { itemId, amountCents: 1_000 }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    await expect(
      owner.mutation(api.budgets.recordPayment, { itemId, amountCents: 2_000 }),
    ).resolves.toMatchObject({ itemId, paidCents: 2_000 });

    await expect(
      partner.mutation(api.budgets.recordPayment, { itemId, amountCents: 3_000 }),
    ).resolves.toMatchObject({ itemId, paidCents: 5_000 });

    await expect(
      outsider.mutation(api.budgets.recordPayment, { itemId, amountCents: 999 }),
    ).rejects.toThrow(NO_ACCESS);

    const afterDenial = (await owner.query(api.budgets.list, { weddingId })).items.find(
      (item) => item._id === itemId,
    );
    expect(afterDenial).toMatchObject({ paidCents: 5_000 });
  });

  it("removeItem: enforces the four-identity matrix and leaves data unchanged on denial", async () => {
    const { owner, partner, outsider, anonymous, weddingId } = await seedFixture();

    const itemForAnonymous = await owner.mutation(api.budgets.addItem, {
      weddingId,
      name: "Anonymous target",
      category: "Decor",
      plannedCents: 1_000,
    });
    await expect(
      anonymous.mutation(api.budgets.removeItem, { itemId: itemForAnonymous }),
    ).rejects.toThrow(NOT_SIGNED_IN);
    const stillThere = (await owner.query(api.budgets.list, { weddingId })).items.find(
      (item) => item._id === itemForAnonymous,
    );
    expect(stillThere).toMatchObject({ name: "Anonymous target" });

    const itemForOutsider = await owner.mutation(api.budgets.addItem, {
      weddingId,
      name: "Outsider target",
      category: "Decor",
      plannedCents: 2_000,
    });
    await expect(
      outsider.mutation(api.budgets.removeItem, { itemId: itemForOutsider }),
    ).rejects.toThrow(NO_ACCESS);
    const stillThereAfterOutsider = (await owner.query(api.budgets.list, { weddingId })).items.find(
      (item) => item._id === itemForOutsider,
    );
    expect(stillThereAfterOutsider).toMatchObject({ name: "Outsider target" });

    const itemForPartner = await owner.mutation(api.budgets.addItem, {
      weddingId,
      name: "Partner removes this",
      category: "Decor",
      plannedCents: 3_000,
    });
    await partner.mutation(api.budgets.removeItem, { itemId: itemForPartner });
    const removedByPartner = (await owner.query(api.budgets.list, { weddingId })).items.find(
      (item) => item._id === itemForPartner,
    );
    expect(removedByPartner).toBeUndefined();

    const itemForOwner = await owner.mutation(api.budgets.addItem, {
      weddingId,
      name: "Owner removes this",
      category: "Decor",
      plannedCents: 4_000,
    });
    await owner.mutation(api.budgets.removeItem, { itemId: itemForOwner });
    const removedByOwner = (await owner.query(api.budgets.list, { weddingId })).items.find(
      (item) => item._id === itemForOwner,
    );
    expect(removedByOwner).toBeUndefined();
  });
});
