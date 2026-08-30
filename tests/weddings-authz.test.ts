import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import {
  NO_ACCESS,
  NOT_OWNER,
  NOT_SIGNED_IN,
  OUTSIDER_SUBJECT,
  PARTNER_SUBJECT,
  seedFixture,
} from "./fixtures/identities";

describe("weddings authorization", () => {
  /**
   * `current` and `ensureUser` deliberately return null rather than throwing
   * for an anonymous caller: AGENTS.md requires the app to render without
   * Clerk or Convex configured, and a throw here would break that shell.
   */
  it("current: returns null when signed out and only ever the caller's own wedding", async () => {
    const { anonymous, owner, partner, outsider, weddingId, otherWeddingId } = await seedFixture();

    await expect(anonymous.query(api.weddings.current, {})).resolves.toBeNull();
    await expect(owner.query(api.weddings.current, {})).resolves.toMatchObject({ _id: weddingId });
    await expect(partner.query(api.weddings.current, {})).resolves.toMatchObject({
      _id: weddingId,
    });
    await expect(outsider.query(api.weddings.current, {})).resolves.toMatchObject({
      _id: otherWeddingId,
    });
  });

  it("summary: enforces the four-identity matrix", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(anonymous.query(api.weddings.summary, { weddingId })).rejects.toThrow(
      NOT_SIGNED_IN,
    );
    await expect(owner.query(api.weddings.summary, { weddingId })).resolves.toMatchObject({
      wedding: { _id: weddingId },
    });
    await expect(partner.query(api.weddings.summary, { weddingId })).resolves.toMatchObject({
      wedding: { _id: weddingId },
    });
    await expect(outsider.query(api.weddings.summary, { weddingId })).rejects.toThrow(NO_ACCESS);
  });

  it("create: requires a signed-in caller and makes only that caller the owner", async () => {
    const { anonymous, outsider } = await seedFixture();

    await expect(
      anonymous.mutation(api.weddings.create, { name: "Anon wedding", totalBudgetCents: 1_000 }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    const newWeddingId = await outsider.mutation(api.weddings.create, {
      name: "Outsider second wedding",
      totalBudgetCents: 1_000,
    });
    await expect(
      outsider.query(api.weddings.members, { weddingId: newWeddingId }),
    ).resolves.toMatchObject([{ clerkUserId: OUTSIDER_SUBJECT, role: "owner" }]);
  });

  it("update: enforces the four-identity matrix and leaves data unchanged on denial", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(
      anonymous.mutation(api.weddings.update, { weddingId, name: "Renamed" }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    await partner.mutation(api.weddings.update, { weddingId, name: "Renamed by partner" });
    await owner.mutation(api.weddings.update, { weddingId, totalBudgetCents: 3_000_000 });

    await expect(
      outsider.mutation(api.weddings.update, { weddingId, name: "Injected" }),
    ).rejects.toThrow(NO_ACCESS);

    await expect(owner.query(api.weddings.summary, { weddingId })).resolves.toMatchObject({
      wedding: { name: "Renamed by partner", totalBudgetCents: 3_000_000 },
    });
  });

  it("members: enforces the four-identity matrix", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(anonymous.query(api.weddings.members, { weddingId })).rejects.toThrow(
      NOT_SIGNED_IN,
    );
    await expect(owner.query(api.weddings.members, { weddingId })).resolves.toHaveLength(2);
    await expect(partner.query(api.weddings.members, { weddingId })).resolves.toHaveLength(2);
    await expect(outsider.query(api.weddings.members, { weddingId })).rejects.toThrow(NO_ACCESS);
  });

  it("ensureUser: returns null when signed out rather than throwing", async () => {
    const { anonymous, partner } = await seedFixture();

    await expect(anonymous.mutation(api.weddings.ensureUser, { name: "Nobody" })).resolves.toBeNull();
    await expect(
      partner.mutation(api.weddings.ensureUser, { name: "Partner" }),
    ).resolves.toBeDefined();
  });

  it("addMember: is owner-only, so the partner is refused along with everyone else", async () => {
    const { anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    await expect(
      anonymous.mutation(api.weddings.addMember, { weddingId, clerkUserId: "invitee" }),
    ).rejects.toThrow(NOT_SIGNED_IN);

    await expect(
      outsider.mutation(api.weddings.addMember, { weddingId, clerkUserId: "invitee" }),
    ).rejects.toThrow(NO_ACCESS);

    // BUILD_PLAN.md:71 gives the owner alone the power to add the V1 partner,
    // so membership is not enough here.
    await expect(
      partner.mutation(api.weddings.addMember, { weddingId, clerkUserId: "invitee" }),
    ).rejects.toThrow(NOT_OWNER);

    // None of the denials wrote a membership row.
    await expect(owner.query(api.weddings.members, { weddingId })).resolves.toHaveLength(2);

    await expect(
      owner.mutation(api.weddings.addMember, { weddingId, clerkUserId: "invitee" }),
    ).resolves.toBeDefined();
    const members = await owner.query(api.weddings.members, { weddingId });
    expect(members).toHaveLength(3);
    expect(members.find((m) => m.clerkUserId === "invitee")).toMatchObject({ role: "partner" });

    // Re-adding an existing member is idempotent rather than a second row.
    await owner.mutation(api.weddings.addMember, { weddingId, clerkUserId: PARTNER_SUBJECT });
    await expect(owner.query(api.weddings.members, { weddingId })).resolves.toHaveLength(3);
  });
});
