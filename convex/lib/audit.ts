/**
 * Durable audit trail (F3). `recordUserEvent` / `recordSystemEvent` insert an
 * immutable `auditEvents` row inside the caller's mutation transaction, so the
 * event and the change it records commit or roll back together.
 *
 * `source` is set here, from the entry point the server code chose — it is
 * never read from a mutation argument, so a UI caller cannot forge `system`
 * (or the F4-reserved `eve`). Rows carry only ids and controlled labels; never
 * pass wedding content (names, notes, contacts, amounts, tokens) in.
 */
import type { Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { auditAction, auditEntity } from "../schema";

type AuditAction = Infer<typeof auditAction>;
type AuditEntity = Infer<typeof auditEntity>;

/** A change made by a signed-in member through a normal (UI) mutation. */
export async function recordUserEvent(
  ctx: MutationCtx,
  args: {
    weddingId: Id<"weddings">;
    actorId: string;
    action: AuditAction;
    entity: AuditEntity;
    entityId?: string;
  },
): Promise<void> {
  await ctx.db.insert("auditEvents", {
    weddingId: args.weddingId,
    source: "ui",
    actorKind: "user",
    actorId: args.actorId,
    action: args.action,
    entity: args.entity,
    entityId: args.entityId,
    at: Date.now(),
  });
}

/** A change made by the system itself (a cron / internalMutation path). */
export async function recordSystemEvent(
  ctx: MutationCtx,
  args: {
    weddingId: Id<"weddings">;
    action: AuditAction;
    entity: AuditEntity;
    entityId?: string;
  },
): Promise<void> {
  await ctx.db.insert("auditEvents", {
    weddingId: args.weddingId,
    source: "system",
    actorKind: "system",
    action: args.action,
    entity: args.entity,
    entityId: args.entityId,
    at: Date.now(),
  });
}
