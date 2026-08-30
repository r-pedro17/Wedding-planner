import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { NO_ACCESS, NOT_SIGNED_IN, seedFixture } from "./fixtures/identities";

describe("vendors authorization", () => {
  it("list: enforces the four-identity matrix", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(anonymous.query(api.vendors.list, { weddingId })).rejects.toThrow(NOT_SIGNED_IN);
    await expect(owner.query(api.vendors.list, { weddingId })).resolves.toEqual([]);
    await expect(partner.query(api.vendors.list, { weddingId })).resolves.toEqual([]);
    await expect(outsider.query(api.vendors.list, { weddingId })).rejects.toThrow(NO_ACCESS);
  });

  it("add: enforces the four-identity matrix", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(
      anonymous.mutation(api.vendors.add, { weddingId, name: "Florist", category: "Florist" }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    await expect(
      owner.mutation(api.vendors.add, { weddingId, name: "Florist", category: "Florist" }),
    ).resolves.toBeDefined();

    await expect(
      partner.mutation(api.vendors.add, { weddingId, name: "Baker", category: "Catering" }),
    ).resolves.toBeDefined();

    await expect(
      outsider.mutation(api.vendors.add, { weddingId, name: "Injected", category: "Decor" }),
    ).rejects.toThrow(NO_ACCESS);

    const names = (await owner.query(api.vendors.list, { weddingId })).map((v) => v.name);
    expect(names.sort()).toEqual(["Baker", "Florist"]);
  });

  it("update: enforces the four-identity matrix and leaves data unchanged on denial", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    const vendorId = await owner.mutation(api.vendors.add, {
      weddingId,
      name: "Florist",
      category: "Florist",
    });

    await expect(
      anonymous.mutation(api.vendors.update, { vendorId, name: "Renamed" }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    await expect(
      partner.mutation(api.vendors.update, { vendorId, name: "Renamed by partner" }),
    ).resolves.toBe(vendorId);

    await expect(owner.mutation(api.vendors.update, { vendorId, status: "booked" })).resolves.toBe(
      vendorId,
    );

    await expect(
      outsider.mutation(api.vendors.update, { vendorId, name: "Injected" }),
    ).rejects.toThrow(NO_ACCESS);

    const afterDenial = (await owner.query(api.vendors.list, { weddingId })).find(
      (v) => v._id === vendorId,
    );
    expect(afterDenial).toMatchObject({ name: "Renamed by partner", status: "booked" });
  });

  it("remove: enforces the four-identity matrix and leaves data unchanged on denial", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    const vendorForAnonymous = await owner.mutation(api.vendors.add, {
      weddingId,
      name: "Anonymous target",
      category: "Florist",
    });
    await expect(
      anonymous.mutation(api.vendors.remove, { vendorId: vendorForAnonymous }),
    ).rejects.toThrow(NOT_SIGNED_IN);
    expect(
      (await owner.query(api.vendors.list, { weddingId })).find((v) => v._id === vendorForAnonymous),
    ).toMatchObject({ name: "Anonymous target" });

    const vendorForOutsider = await owner.mutation(api.vendors.add, {
      weddingId,
      name: "Outsider target",
      category: "Florist",
    });
    await expect(
      outsider.mutation(api.vendors.remove, { vendorId: vendorForOutsider }),
    ).rejects.toThrow(NO_ACCESS);
    expect(
      (await owner.query(api.vendors.list, { weddingId })).find((v) => v._id === vendorForOutsider),
    ).toMatchObject({ name: "Outsider target" });

    const vendorForPartner = await owner.mutation(api.vendors.add, {
      weddingId,
      name: "Partner removes this",
      category: "Florist",
    });
    await partner.mutation(api.vendors.remove, { vendorId: vendorForPartner });
    expect(
      (await owner.query(api.vendors.list, { weddingId })).find((v) => v._id === vendorForPartner),
    ).toBeUndefined();

    const vendorForOwner = await owner.mutation(api.vendors.add, {
      weddingId,
      name: "Owner removes this",
      category: "Florist",
    });
    await owner.mutation(api.vendors.remove, { vendorId: vendorForOwner });
    expect(
      (await owner.query(api.vendors.list, { weddingId })).find((v) => v._id === vendorForOwner),
    ).toBeUndefined();
  });

  it("remove: unlinking stays scoped to the vendor's own wedding", async () => {
    const { owner, outsider, weddingId, otherWeddingId } = await seedFixture();

    // The outsider owns wedding B, so they can drive it through the public API.
    const vendorA = await owner.mutation(api.vendors.add, {
      weddingId,
      name: "Shared name florist",
      category: "Florist",
    });
    const vendorB = await outsider.mutation(api.vendors.add, {
      weddingId: otherWeddingId,
      name: "Shared name florist",
      category: "Florist",
    });

    const itemA = await owner.mutation(api.budgets.addItem, {
      weddingId,
      name: "Flowers A",
      category: "Decor",
      plannedCents: 10_000,
      vendorId: vendorA,
    });
    const taskA = await owner.mutation(api.tasks.create, {
      weddingId,
      title: "Confirm florist A",
      vendorId: vendorA,
    });
    const itemB = await outsider.mutation(api.budgets.addItem, {
      weddingId: otherWeddingId,
      name: "Flowers B",
      category: "Decor",
      plannedCents: 10_000,
      vendorId: vendorB,
    });
    const taskB = await outsider.mutation(api.tasks.create, {
      weddingId: otherWeddingId,
      title: "Confirm florist B",
      vendorId: vendorB,
    });

    await owner.mutation(api.vendors.remove, { vendorId: vendorA });

    // Wedding A's links are cleared...
    expect(
      (await owner.query(api.budgets.list, { weddingId })).items.find((i) => i._id === itemA)
        ?.vendorId,
    ).toBeUndefined();
    expect(
      (await owner.query(api.tasks.list, { weddingId })).find((task) => task._id === taskA)
        ?.vendorId,
    ).toBeUndefined();

    // ...and wedding B's identically named vendor and its links are untouched.
    expect(
      (await outsider.query(api.vendors.list, { weddingId: otherWeddingId })).map((v) => v._id),
    ).toEqual([vendorB]);
    expect(
      (await outsider.query(api.budgets.list, { weddingId: otherWeddingId })).items.find(
        (i) => i._id === itemB,
      )?.vendorId,
    ).toBe(vendorB);
    expect(
      (await outsider.query(api.tasks.list, { weddingId: otherWeddingId })).find(
        (task) => task._id === taskB,
      )?.vendorId,
    ).toBe(vendorB);
  });
});
