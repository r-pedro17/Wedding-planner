import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import {
  NO_ACCESS,
  NOT_SIGNED_IN,
  WRONG_WEDDING_VENDOR,
  seedFixture,
} from "./fixtures/identities";
import type { Id } from "../convex/_generated/dataModel";

describe("tasks authorization", () => {
  it("list: enforces the four-identity matrix", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(anonymous.query(api.tasks.list, { weddingId })).rejects.toThrow(NOT_SIGNED_IN);
    await expect(owner.query(api.tasks.list, { weddingId })).resolves.toEqual([]);
    await expect(partner.query(api.tasks.list, { weddingId })).resolves.toEqual([]);
    await expect(outsider.query(api.tasks.list, { weddingId })).rejects.toThrow(NO_ACCESS);
  });

  it("create: enforces the four-identity matrix and rejects cross-wedding vendorId", async () => {
    const { t, anonymous, owner, partner, outsider, weddingId, otherWeddingId } = await seedFixture();

    await expect(
      anonymous.mutation(api.tasks.create, { weddingId, title: "Book venue" }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    await expect(
      owner.mutation(api.tasks.create, { weddingId, title: "Book venue" }),
    ).resolves.toBeDefined();

    await expect(
      partner.mutation(api.tasks.create, { weddingId, title: "Order cake" }),
    ).resolves.toBeDefined();

    await expect(
      outsider.mutation(api.tasks.create, { weddingId, title: "Injected" }),
    ).rejects.toThrow(NO_ACCESS);

    // Only the two authorized creations landed; the denials wrote nothing.
    const titles = (await owner.query(api.tasks.list, { weddingId })).map((task) => task.title);
    expect(titles.sort()).toEqual(["Book venue", "Order cake"]);

    const otherVendorId: Id<"vendors"> = await t.run(async (ctx) => {
      return await ctx.db.insert("vendors", {
        weddingId: otherWeddingId,
        name: "Wedding B Florist",
        category: "Florist",
        status: "considering",
      });
    });

    await expect(
      owner.mutation(api.tasks.create, {
        weddingId,
        title: "Cross wedding vendor",
        vendorId: otherVendorId,
      }),
    ).rejects.toThrow(WRONG_WEDDING_VENDOR);

    const afterVendorDenial = await owner.query(api.tasks.list, { weddingId });
    expect(afterVendorDenial).toHaveLength(2);
  });

  it("update: enforces the four-identity matrix, leaves data unchanged on denial, and rejects cross-wedding vendorId", async () => {
    const { t, anonymous, owner, partner, outsider, weddingId, otherWeddingId } = await seedFixture();

    const taskId = await owner.mutation(api.tasks.create, { weddingId, title: "Book venue" });

    await expect(
      anonymous.mutation(api.tasks.update, { taskId, title: "Renamed" }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    await expect(
      partner.mutation(api.tasks.update, { taskId, title: "Renamed by partner" }),
    ).resolves.toBe(taskId);

    await expect(
      owner.mutation(api.tasks.update, { taskId, owner: "Alex" }),
    ).resolves.toBe(taskId);

    await expect(
      outsider.mutation(api.tasks.update, { taskId, title: "Injected" }),
    ).rejects.toThrow(NO_ACCESS);

    const afterDenial = (await owner.query(api.tasks.list, { weddingId })).find(
      (task) => task._id === taskId,
    );
    expect(afterDenial).toMatchObject({ title: "Renamed by partner", owner: "Alex" });

    const otherVendorId: Id<"vendors"> = await t.run(async (ctx) => {
      return await ctx.db.insert("vendors", {
        weddingId: otherWeddingId,
        name: "Wedding B Florist",
        category: "Florist",
        status: "considering",
      });
    });

    await expect(
      owner.mutation(api.tasks.update, { taskId, vendorId: otherVendorId }),
    ).rejects.toThrow(WRONG_WEDDING_VENDOR);

    const afterVendorDenial = (await owner.query(api.tasks.list, { weddingId })).find(
      (task) => task._id === taskId,
    );
    expect(afterVendorDenial?.vendorId).toBeUndefined();
  });

  it("complete: enforces the four-identity matrix and leaves status unchanged on denial", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    const taskId = await owner.mutation(api.tasks.create, { weddingId, title: "Book venue" });

    await expect(anonymous.mutation(api.tasks.complete, { taskId })).rejects.toThrow(NOT_SIGNED_IN);
    await expect(outsider.mutation(api.tasks.complete, { taskId })).rejects.toThrow(NO_ACCESS);

    const afterDenial = (await owner.query(api.tasks.list, { weddingId })).find(
      (task) => task._id === taskId,
    );
    expect(afterDenial).toMatchObject({ status: "todo" });

    await expect(owner.mutation(api.tasks.complete, { taskId })).resolves.toBe(taskId);

    const partnerTaskId = await owner.mutation(api.tasks.create, {
      weddingId,
      title: "Order cake",
    });
    await expect(partner.mutation(api.tasks.complete, { taskId: partnerTaskId })).resolves.toBe(
      partnerTaskId,
    );

    const statuses = (await owner.query(api.tasks.list, { weddingId })).map((task) => task.status);
    expect(statuses).toEqual(["done", "done"]);
  });

  it("remove: enforces the four-identity matrix and leaves data unchanged on denial", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    const taskForAnonymous = await owner.mutation(api.tasks.create, {
      weddingId,
      title: "Anonymous target",
    });
    await expect(
      anonymous.mutation(api.tasks.remove, { taskId: taskForAnonymous }),
    ).rejects.toThrow(NOT_SIGNED_IN);
    const stillThere = (await owner.query(api.tasks.list, { weddingId })).find(
      (task) => task._id === taskForAnonymous,
    );
    expect(stillThere).toMatchObject({ title: "Anonymous target" });

    const taskForOutsider = await owner.mutation(api.tasks.create, {
      weddingId,
      title: "Outsider target",
    });
    await expect(
      outsider.mutation(api.tasks.remove, { taskId: taskForOutsider }),
    ).rejects.toThrow(NO_ACCESS);
    const stillThereAfterOutsider = (await owner.query(api.tasks.list, { weddingId })).find(
      (task) => task._id === taskForOutsider,
    );
    expect(stillThereAfterOutsider).toMatchObject({ title: "Outsider target" });

    const taskForPartner = await owner.mutation(api.tasks.create, {
      weddingId,
      title: "Partner removes this",
    });
    await partner.mutation(api.tasks.remove, { taskId: taskForPartner });
    const removedByPartner = (await owner.query(api.tasks.list, { weddingId })).find(
      (task) => task._id === taskForPartner,
    );
    expect(removedByPartner).toBeUndefined();

    const taskForOwner = await owner.mutation(api.tasks.create, {
      weddingId,
      title: "Owner removes this",
    });
    await owner.mutation(api.tasks.remove, { taskId: taskForOwner });
    const removedByOwner = (await owner.query(api.tasks.list, { weddingId })).find(
      (task) => task._id === taskForOwner,
    );
    expect(removedByOwner).toBeUndefined();
  });
});
