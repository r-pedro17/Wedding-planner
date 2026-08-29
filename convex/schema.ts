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
});
