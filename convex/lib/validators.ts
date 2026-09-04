/**
 * Shared return-shape validators. Every public function declares `returns` so
 * the client contract is checked at the boundary rather than inferred, and so
 * a handler can never leak a field the schema did not promise.
 */
import { v } from "convex/values";
import {
  auditAction,
  auditActorKind,
  auditEntity,
  auditSource,
  budgetItemStatus,
  membershipRole,
  taskStatus,
  vendorStatus,
} from "../schema";

export const dueStateValidator = v.union(
  v.literal("none"),
  v.literal("overdue"),
  v.literal("today"),
  v.literal("upcoming"),
);

export const weddingDoc = v.object({
  _id: v.id("weddings"),
  _creationTime: v.number(),
  name: v.string(),
  weddingDate: v.optional(v.string()),
  currency: v.string(),
  totalBudgetCents: v.number(),
});

/** `weddings.current` and `weddings.summary` add a derived countdown. */
export const weddingWithCountdown = v.object({
  ...weddingDoc.fields,
  daysUntil: v.union(v.number(), v.null()),
});

export const membershipDoc = v.object({
  _id: v.id("memberships"),
  _creationTime: v.number(),
  weddingId: v.id("weddings"),
  clerkUserId: v.string(),
  role: membershipRole,
});

export const budgetCategoryDoc = v.object({
  _id: v.id("budgetCategories"),
  _creationTime: v.number(),
  weddingId: v.id("weddings"),
  name: v.string(),
});

export const budgetItemDoc = v.object({
  _id: v.id("budgetItems"),
  _creationTime: v.number(),
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
});

/** `budgets.list` adds what is still owed, recomputed per read. */
export const budgetItemWithRemaining = v.object({
  ...budgetItemDoc.fields,
  remainingCents: v.number(),
});

/** Mirrors `BudgetTotals` in `lib/budget.ts`; never persisted. */
export const budgetTotals = v.object({
  totalBudgetCents: v.number(),
  plannedCents: v.number(),
  committedCents: v.number(),
  paidCents: v.number(),
  remainingCents: v.number(),
  unallocatedCents: v.number(),
  overBudget: v.boolean(),
});

export const taskDoc = v.object({
  _id: v.id("tasks"),
  _creationTime: v.number(),
  weddingId: v.id("weddings"),
  title: v.string(),
  notes: v.optional(v.string()),
  dueDate: v.optional(v.string()),
  owner: v.optional(v.string()),
  status: taskStatus,
  vendorId: v.optional(v.id("vendors")),
});

/** `tasks.list` adds the derived due state. */
export const taskWithDueState = v.object({
  ...taskDoc.fields,
  dueState: dueStateValidator,
});

export const vendorDoc = v.object({
  _id: v.id("vendors"),
  _creationTime: v.number(),
  weddingId: v.id("weddings"),
  name: v.string(),
  category: v.string(),
  contactName: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  website: v.optional(v.string()),
  notes: v.optional(v.string()),
  status: vendorStatus,
});

export const auditEventDoc = v.object({
  _id: v.id("auditEvents"),
  _creationTime: v.number(),
  weddingId: v.id("weddings"),
  source: auditSource,
  actorKind: auditActorKind,
  actorId: v.optional(v.string()),
  action: auditAction,
  entity: auditEntity,
  entityId: v.optional(v.string()),
  at: v.number(),
});

export const reminderDoc = v.object({
  _id: v.id("reminders"),
  _creationTime: v.number(),
  weddingId: v.id("weddings"),
  kind: v.union(v.literal("payment_due"), v.literal("task_due")),
  subjectId: v.string(),
  dueDate: v.string(),
  message: v.string(),
  notifiedAt: v.optional(v.number()),
  dismissedAt: v.optional(v.number()),
});
