import { sumCents } from "./money";
import { dueState, isDueWithin, type DateOnly } from "./dates";

export type BudgetItemLike = {
  name: string;
  category: string;
  plannedCents: number;
  quotedCents?: number;
  committedCents?: number;
  paidCents: number;
  dueDate?: DateOnly;
  status: BudgetItemStatus;
};

export type BudgetItemStatus = "idea" | "quoted" | "booked" | "paid";

export const BUDGET_ITEM_STATUSES: BudgetItemStatus[] = ["idea", "quoted", "booked", "paid"];

/** What is still owed on one item: committed (or planned) minus paid. */
export function remainingCents(item: BudgetItemLike): number {
  const owed = item.committedCents ?? item.plannedCents;
  return Math.max(owed - item.paidCents, 0);
}

export type BudgetTotals = {
  totalBudgetCents: number;
  plannedCents: number;
  committedCents: number;
  paidCents: number;
  remainingCents: number;
  unallocatedCents: number;
  overBudget: boolean;
};

/** All totals are recomputed from the stored rows. Never persist these. */
export function computeTotals(
  items: readonly BudgetItemLike[],
  totalBudgetCents: number,
): BudgetTotals {
  const planned = sumCents(items.map((i) => i.plannedCents));
  const committed = sumCents(items.map((i) => i.committedCents ?? 0));
  const paid = sumCents(items.map((i) => i.paidCents));
  const remaining = sumCents(items.map(remainingCents));
  return {
    totalBudgetCents,
    plannedCents: planned,
    committedCents: committed,
    paidCents: paid,
    remainingCents: remaining,
    unallocatedCents: totalBudgetCents - planned,
    overBudget: planned > totalBudgetCents,
  };
}

export function byCategory(items: readonly BudgetItemLike[]): Record<string, BudgetTotals> {
  const groups: Record<string, BudgetItemLike[]> = {};
  for (const item of items) {
    (groups[item.category] ??= []).push(item);
  }
  return Object.fromEntries(
    Object.entries(groups).map(([category, rows]) => [
      category,
      computeTotals(rows, sumCents(rows.map((r) => r.plannedCents))),
    ]),
  );
}

/** Items with money still owed and a due date inside the window. */
export function upcomingPayments<T extends BudgetItemLike>(
  items: readonly T[],
  days = 30,
  from?: DateOnly,
): T[] {
  return items
    .filter((item) => remainingCents(item) > 0 && item.dueDate !== undefined)
    .filter((item) => dueState(item.dueDate, from) === "overdue" || isDueWithin(item.dueDate, days, from))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
}
