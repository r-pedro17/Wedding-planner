import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { NO_ACCESS, NOT_SIGNED_IN, seedFixture } from "./fixtures/identities";

describe("guests authorization", () => {
  it("list: enforces the four-identity matrix", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(anonymous.query(api.guests.list, { weddingId })).rejects.toThrow(NOT_SIGNED_IN);
    await expect(owner.query(api.guests.list, { weddingId })).resolves.toEqual({
      guests: [],
      totalHeadcount: 0,
    });
    await expect(partner.query(api.guests.list, { weddingId })).resolves.toEqual({
      guests: [],
      totalHeadcount: 0,
    });
    await expect(outsider.query(api.guests.list, { weddingId })).rejects.toThrow(NO_ACCESS);
  });

  it("create: enforces the four-identity matrix", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(
      anonymous.mutation(api.guests.create, { weddingId, name: "Anon party", partySize: 2 }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    await expect(
      owner.mutation(api.guests.create, { weddingId, name: "Owner party", partySize: 2 }),
    ).resolves.toBeDefined();

    await expect(
      partner.mutation(api.guests.create, { weddingId, name: "Partner party", partySize: 3 }),
    ).resolves.toBeDefined();

    await expect(
      outsider.mutation(api.guests.create, { weddingId, name: "Injected", partySize: 1 }),
    ).rejects.toThrow(NO_ACCESS);

    const after = await owner.query(api.guests.list, { weddingId });
    expect(after.guests.map((g) => g.name)).toEqual(["Owner party", "Partner party"]);
    expect(after.totalHeadcount).toBe(5);
  });

  it("update: enforces the four-identity matrix and leaves data unchanged on denial", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    const guestId = await owner.mutation(api.guests.create, {
      weddingId,
      name: "Owner party",
      partySize: 2,
    });

    await expect(
      anonymous.mutation(api.guests.update, { guestId, name: "Renamed", partySize: 9 }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    await expect(
      partner.mutation(api.guests.update, { guestId, name: "Renamed by partner", partySize: 4 }),
    ).resolves.toBe(guestId);

    await expect(
      owner.mutation(api.guests.update, { guestId, name: "Renamed by owner", partySize: 5 }),
    ).resolves.toBe(guestId);

    await expect(
      outsider.mutation(api.guests.update, { guestId, name: "Injected", partySize: 99 }),
    ).rejects.toThrow(NO_ACCESS);

    const afterDenial = (await owner.query(api.guests.list, { weddingId })).guests.find(
      (g) => g._id === guestId,
    );
    expect(afterDenial).toMatchObject({ name: "Renamed by owner", partySize: 5 });
  });

  it("remove: enforces the four-identity matrix and leaves data unchanged on denial", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    const guestForAnonymous = await owner.mutation(api.guests.create, {
      weddingId,
      name: "Anonymous target",
      partySize: 1,
    });
    await expect(
      anonymous.mutation(api.guests.remove, { guestId: guestForAnonymous }),
    ).rejects.toThrow(NOT_SIGNED_IN);
    expect(
      (await owner.query(api.guests.list, { weddingId })).guests.find(
        (g) => g._id === guestForAnonymous,
      ),
    ).toMatchObject({ name: "Anonymous target" });

    const guestForOutsider = await owner.mutation(api.guests.create, {
      weddingId,
      name: "Outsider target",
      partySize: 1,
    });
    await expect(
      outsider.mutation(api.guests.remove, { guestId: guestForOutsider }),
    ).rejects.toThrow(NO_ACCESS);
    expect(
      (await owner.query(api.guests.list, { weddingId })).guests.find(
        (g) => g._id === guestForOutsider,
      ),
    ).toMatchObject({ name: "Outsider target" });

    const guestForPartner = await owner.mutation(api.guests.create, {
      weddingId,
      name: "Partner removes this",
      partySize: 1,
    });
    await partner.mutation(api.guests.remove, { guestId: guestForPartner });
    expect(
      (await owner.query(api.guests.list, { weddingId })).guests.find(
        (g) => g._id === guestForPartner,
      ),
    ).toBeUndefined();

    const guestForOwner = await owner.mutation(api.guests.create, {
      weddingId,
      name: "Owner removes this",
      partySize: 1,
    });
    await owner.mutation(api.guests.remove, { guestId: guestForOwner });
    expect(
      (await owner.query(api.guests.list, { weddingId })).guests.find(
        (g) => g._id === guestForOwner,
      ),
    ).toBeUndefined();
  });
});
