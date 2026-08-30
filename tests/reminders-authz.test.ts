import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { NO_ACCESS, NOT_SIGNED_IN, seedFixture } from "./fixtures/identities";
import type { Id } from "../convex/_generated/dataModel";
import type { Fixture } from "./fixtures/identities";

/**
 * Reminders are written only by the internal cron mutations, so the matrix
 * seeds a row directly rather than driving a public creation path.
 */
async function seedReminder(
  t: Fixture["t"],
  weddingId: Id<"weddings">,
  message: string,
): Promise<Id<"reminders">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("reminders", {
      weddingId,
      kind: "task_due",
      subjectId: "seeded-subject",
      dueDate: "2026-01-01",
      message,
    });
  });
}

describe("reminders authorization", () => {
  it("list: enforces the four-identity matrix", async () => {
    const { t, anonymous, owner, partner, outsider, weddingId } = await seedFixture();
    await seedReminder(t, weddingId, "Wedding A reminder");

    await expect(anonymous.query(api.reminders.list, { weddingId })).rejects.toThrow(NOT_SIGNED_IN);
    await expect(owner.query(api.reminders.list, { weddingId })).resolves.toMatchObject([
      { message: "Wedding A reminder" },
    ]);
    await expect(partner.query(api.reminders.list, { weddingId })).resolves.toMatchObject([
      { message: "Wedding A reminder" },
    ]);
    await expect(outsider.query(api.reminders.list, { weddingId })).rejects.toThrow(NO_ACCESS);
  });

  it("list: never returns another wedding's reminders", async () => {
    const { t, owner, outsider, weddingId, otherWeddingId } = await seedFixture();
    await seedReminder(t, weddingId, "Wedding A reminder");
    await seedReminder(t, otherWeddingId, "Wedding B reminder");

    await expect(owner.query(api.reminders.list, { weddingId })).resolves.toMatchObject([
      { message: "Wedding A reminder" },
    ]);
    await expect(
      outsider.query(api.reminders.list, { weddingId: otherWeddingId }),
    ).resolves.toMatchObject([{ message: "Wedding B reminder" }]);
  });

  it("dismiss: enforces the four-identity matrix and leaves the reminder open on denial", async () => {
    const { t, anonymous, owner, partner, outsider, weddingId } = await seedFixture();

    const forAnonymous = await seedReminder(t, weddingId, "Anonymous target");
    await expect(
      anonymous.mutation(api.reminders.dismiss, { reminderId: forAnonymous }),
    ).rejects.toThrow(NOT_SIGNED_IN);
    expect((await owner.query(api.reminders.list, { weddingId })).map((r) => r._id)).toContain(
      forAnonymous,
    );

    const forOutsider = await seedReminder(t, weddingId, "Outsider target");
    await expect(
      outsider.mutation(api.reminders.dismiss, { reminderId: forOutsider }),
    ).rejects.toThrow(NO_ACCESS);
    expect((await owner.query(api.reminders.list, { weddingId })).map((r) => r._id)).toContain(
      forOutsider,
    );

    // Both members may dismiss; a dismissed reminder drops out of `list`.
    await partner.mutation(api.reminders.dismiss, { reminderId: forAnonymous });
    await owner.mutation(api.reminders.dismiss, { reminderId: forOutsider });
    expect(await owner.query(api.reminders.list, { weddingId })).toEqual([]);
  });
});
