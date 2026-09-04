import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const budgetItemStatus = v.union(
  v.literal("idea"),
  v.literal("quoted"),
  v.literal("booked"),
  v.literal("paid"),
);

export const taskStatus = v.union(
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("done"),
);

export const vendorStatus = v.union(
  v.literal("considering"),
  v.literal("contacted"),
  v.literal("booked"),
  v.literal("declined"),
);

export const membershipRole = v.union(v.literal("owner"), v.literal("partner"));

/**
 * Audit vocabulary. Labels are a closed set so a row can never carry free-form
 * content, and `source` is derived server-side (never a mutation arg): a normal
 * UI caller produces only `ui`; the cron path produces `system`; `eve` is
 * reserved for F4's delegated-auth path and is not yet produced anywhere.
 */
export const auditSource = v.union(
  v.literal("ui"),
  v.literal("eve"),
  v.literal("system"),
);

export const auditActorKind = v.union(v.literal("user"), v.literal("system"));

export const auditAction = v.union(
  v.literal("create"),
  v.literal("update"),
  v.literal("delete"),
  v.literal("complete"),
  v.literal("payment"),
  v.literal("dismiss"),
  v.literal("refresh"),
);

export const auditEntity = v.union(
  v.literal("wedding"),
  v.literal("membership"),
  v.literal("budgetCategory"),
  v.literal("budgetItem"),
  v.literal("task"),
  v.literal("vendor"),
  v.literal("guest"),
  v.literal("reminder"),
);

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_clerk_user", ["clerkUserId"]),

  weddings: defineTable({
    name: v.string(),
    // Date-only YYYY-MM-DD.
    weddingDate: v.optional(v.string()),
    currency: v.string(),
    // Integer minor units.
    totalBudgetCents: v.number(),
  }),

  memberships: defineTable({
    weddingId: v.id("weddings"),
    clerkUserId: v.string(),
    role: membershipRole,
  })
    .index("by_wedding", ["weddingId"])
    .index("by_user", ["clerkUserId"])
    .index("by_user_and_wedding", ["clerkUserId", "weddingId"]),

  budgetCategories: defineTable({
    weddingId: v.id("weddings"),
    name: v.string(),
  }).index("by_wedding", ["weddingId"]),

  budgetItems: defineTable({
    weddingId: v.id("weddings"),
    name: v.string(),
    category: v.string(),
    plannedCents: v.number(),
    quotedCents: v.optional(v.number()),
    committedCents: v.optional(v.number()),
    paidCents: v.number(),
    dueDate: v.optional(v.string()),
    vendorId: v.optional(v.id("vendors")),
    status: budgetItemStatus,
    notes: v.optional(v.string()),
  })
    .index("by_wedding", ["weddingId"])
    .index("by_wedding_and_due", ["weddingId", "dueDate"]),

  tasks: defineTable({
    weddingId: v.id("weddings"),
    title: v.string(),
    notes: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    owner: v.optional(v.string()),
    status: taskStatus,
    vendorId: v.optional(v.id("vendors")),
  })
    .index("by_wedding", ["weddingId"])
    .index("by_wedding_and_status", ["weddingId", "status"])
    .index("by_wedding_and_due", ["weddingId", "dueDate"]),

  vendors: defineTable({
    weddingId: v.id("weddings"),
    name: v.string(),
    category: v.string(),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: vendorStatus,
  }).index("by_wedding", ["weddingId"]),

  guests: defineTable({
    weddingId: v.id("weddings"),
    name: v.string(),
    partySize: v.number(),
    notes: v.optional(v.string()),
  }).index("by_wedding", ["weddingId"]),

  reminders: defineTable({
    weddingId: v.id("weddings"),
    kind: v.union(v.literal("payment_due"), v.literal("task_due")),
    // The budgetItem or task this reminder is about.
    subjectId: v.string(),
    dueDate: v.string(),
    message: v.string(),
    // Set once the reminder has been surfaced, so crons never duplicate it.
    notifiedAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),
  })
    .index("by_wedding", ["weddingId"])
    .index("by_wedding_and_subject", ["weddingId", "subjectId"])
    .index("by_pending", ["notifiedAt"]),

  /**
   * Immutable, wedding-scoped audit trail (F3). Written in the same
   * transaction as each important successful mutation. Records only ids and
   * controlled labels — never prompts, notes, contacts, money amounts, tokens,
   * or document snapshots. There is deliberately no mutation to alter a row.
   */
  auditEvents: defineTable({
    weddingId: v.id("weddings"),
    source: auditSource,
    actorKind: auditActorKind,
    // Clerk user id for user actions; absent for the system (cron) path.
    actorId: v.optional(v.string()),
    action: auditAction,
    entity: auditEntity,
    // Stringified id of the affected row (may span tables), or absent.
    entityId: v.optional(v.string()),
    // Server wall-clock at write time (`Date.now()`).
    at: v.number(),
  })
    .index("by_wedding", ["weddingId"])
    .index("by_wedding_and_time", ["weddingId", "at"]),
});
