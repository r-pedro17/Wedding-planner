import type { FunctionReference } from "convex/server";
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

const todayStr = new Date().toISOString().slice(0, 10);

type TestT = TestConvex<typeof schema>;

async function seedWedding(t: TestT, ownerId: string, name = "Our wedding") {
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

async function auditRows(t: TestT, weddingId: Id<"weddings">) {
  return await t.run((ctx) =>
    ctx.db
      .query("auditEvents")
      .withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
      .collect(),
  );
}

describe("F3 durable audit events", () => {
  it("records exactly one ui-sourced event per important successful mutation", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "owner" });
    const weddingId = await seedWedding(t, "owner");

    const taskId = await owner.mutation(api.tasks.create, { weddingId, title: "Book venue" });
    const guestId = await owner.mutation(api.guests.create, { weddingId, name: "Ada", partySize: 2 });
    const itemId = await owner.mutation(api.budgets.addItem, {
      weddingId,
      name: "Cake",
      category: "Food",
      plannedCents: 50_000,
    });
    await owner.mutation(api.budgets.recordPayment, { itemId, amountCents: 10_000 });
    await owner.mutation(api.tasks.complete, { taskId });

    const rows = await auditRows(t, weddingId);
    // create wedding is seeded directly (no mutation), so it is not audited here.
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.source).toBe("ui");
      expect(row.actorKind).toBe("user");
      expect(row.actorId).toBe("owner");
    }
    expect(rows.map((r) => `${r.entity}.${r.action}`).sort()).toEqual(
      ["budgetItem.create", "budgetItem.payment", "guest.create", "task.complete", "task.create"].sort(),
    );
    expect(rows.filter((r) => r.entityId === taskId && r.action === "create")).toHaveLength(1);
    expect(rows.some((r) => r.entityId === guestId)).toBe(true);
    expect(rows.some((r) => r.entityId === itemId && r.action === "payment")).toBe(true);

    // Rows never carry wedding content.
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(
        ["_creationTime", "_id", "action", "actorId", "actorKind", "at", "entity", "entityId", "source", "weddingId"].sort(),
      );
    }
  });

  it("writes no event when the mutation is rejected", async () => {
    const t = convexTest(schema, modules);
    const weddingId = await seedWedding(t, "owner");
    const owner = t.withIdentity({ subject: "owner" });
    const outsider = t.withIdentity({ subject: "outsider" });

    // Authorization failure.
    await expect(
      outsider.mutation(api.guests.create, { weddingId, name: "Injected", partySize: 1 }),
    ).rejects.toThrow("You do not have access");
    // Validation failure inside an authorized call.
    await expect(owner.mutation(api.tasks.create, { weddingId, title: "   " })).rejects.toThrow(
      "Task title is required",
    );

    expect(await auditRows(t, weddingId)).toHaveLength(0);
  });

  it("lets only wedding members read the history", async () => {
    const t = convexTest(schema, modules);
    const weddingId = await seedWedding(t, "owner");
    const owner = t.withIdentity({ subject: "owner" });
    const outsider = t.withIdentity({ subject: "outsider" });
    await owner.mutation(api.tasks.create, { weddingId, title: "Book venue" });

    await expect(t.query(api.audit.list, { weddingId })).rejects.toThrow("Not signed in");
    await expect(outsider.query(api.audit.list, { weddingId })).rejects.toThrow(
      "You do not have access",
    );

    const history = await owner.query(api.audit.list, { weddingId });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ entity: "task", action: "create", source: "ui" });
  });

  it("exposes no public API to alter recorded history", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "owner" });
    const weddingId = await seedWedding(t, "owner");
    await owner.mutation(api.tasks.create, { weddingId, title: "Book venue" });
    const [event] = await auditRows(t, weddingId);

    // No mutation exists to edit or delete an audit event: plausible names do
    // not resolve to any registered function.
    for (const name of ["update", "remove", "delete", "patch", "edit"] as const) {
      const ref = (api.audit as unknown as Record<string, FunctionReference<"mutation">>)[name];
      await expect(owner.mutation(ref, { id: event._id })).rejects.toThrow(
        /no such export|Could not find public function|is not a mutation/i,
      );
    }
  });

  it("a normal ui caller cannot forge source: eve or system", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "owner" });
    const weddingId = await seedWedding(t, "owner");

    // `source` is not a declared argument; passing it is a validation error,
    // and even if ignored the recorded event is server-derived "ui".
    await expect(
      owner.mutation(api.tasks.create, {
        weddingId,
        title: "Forge attempt",
        source: "eve",
      } as unknown as { weddingId: Id<"weddings">; title: string }),
    ).rejects.toThrow();

    await owner.mutation(api.tasks.create, { weddingId, title: "Legit" });
    const rows = await auditRows(t, weddingId);
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("ui");
    expect(rows.some((r) => r.source === "eve" || r.source === "system")).toBe(false);
  });

  it("derives source: system for the cron refresh path", async () => {
    const t = convexTest(schema, modules);
    const weddingId = await seedWedding(t, "owner");
    const owner = t.withIdentity({ subject: "owner" });
    // A payment due today, so refreshAll creates a reminder for this wedding.
    await owner.mutation(api.budgets.addItem, {
      weddingId,
      name: "Deposit",
      category: "Venue",
      plannedCents: 100_000,
      dueDate: todayStr,
    });

    await t.mutation(internal.reminders.refreshAll, { withinDays: 14 });

    const rows = await auditRows(t, weddingId);
    const systemRows = rows.filter((r) => r.source === "system");
    expect(systemRows).toHaveLength(1);
    expect(systemRows[0]).toMatchObject({
      actorKind: "system",
      action: "refresh",
      entity: "reminder",
    });
    expect(systemRows[0].actorId).toBeUndefined();
  });
});
