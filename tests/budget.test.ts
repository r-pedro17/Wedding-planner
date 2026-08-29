import { describe, expect, it } from "vitest";
import {
  byCategory,
  computeTotals,
  remainingCents,
  upcomingPayments,
  type BudgetItemLike,
} from "../convex/lib/budget";

const FROM = "2026-03-01";

function item(overrides: Partial<BudgetItemLike> = {}): BudgetItemLike {
  return {
    name: "Item",
    category: "Other",
    plannedCents: 100_000,
    paidCents: 0,
    status: "idea",
    ...overrides,
  };
}

describe("remainingCents", () => {
  it("uses committed when present, otherwise planned", () => {
    expect(remainingCents(item({ plannedCents: 200_000, committedCents: 185_000, paidCents: 50_000 }))).toBe(135_000);
    expect(remainingCents(item({ plannedCents: 200_000, paidCents: 50_000 }))).toBe(150_000);
  });

  it("never goes negative when overpaid", () => {
    expect(remainingCents(item({ plannedCents: 100_000, paidCents: 120_000 }))).toBe(0);
  });
});

describe("computeTotals", () => {
  const items = [
    item({ name: "Venue", category: "Venue", plannedCents: 800_000, committedCents: 800_000, paidCents: 200_000 }),
    item({ name: "Photos", category: "Photography", plannedCents: 200_000, committedCents: 185_000, paidCents: 50_000 }),
    item({ name: "Flowers", category: "Flowers", plannedCents: 95_000 }),
  ];

  it("derives every total from the rows", () => {
    const totals = computeTotals(items, 2_000_000);
    expect(totals.plannedCents).toBe(1_095_000);
    expect(totals.committedCents).toBe(985_000);
    expect(totals.paidCents).toBe(250_000);
    expect(totals.remainingCents).toBe(600_000 + 135_000 + 95_000);
    expect(totals.unallocatedCents).toBe(905_000);
    expect(totals.overBudget).toBe(false);
  });

  it("flags over budget and a negative unallocated amount", () => {
    const totals = computeTotals(items, 1_000_000);
    expect(totals.overBudget).toBe(true);
    expect(totals.unallocatedCents).toBe(-95_000);
  });

  it("handles an empty budget", () => {
    const totals = computeTotals([], 500_000);
    expect(totals).toMatchObject({ plannedCents: 0, paidCents: 0, remainingCents: 0, overBudget: false });
    expect(totals.unallocatedCents).toBe(500_000);
  });

  it("recording a payment moves paid and remaining by the same amount", () => {
    const before = computeTotals(items, 2_000_000);
    const after = computeTotals(
      items.map((row) => (row.name === "Photos" ? { ...row, paidCents: row.paidCents + 50_000 } : row)),
      2_000_000,
    );
    expect(after.paidCents - before.paidCents).toBe(50_000);
    expect(before.remainingCents - after.remainingCents).toBe(50_000);
  });
});

describe("byCategory", () => {
  it("groups items under their category", () => {
    const groups = byCategory([
      item({ category: "Venue", plannedCents: 800_000 }),
      item({ category: "Venue", plannedCents: 100_000 }),
      item({ category: "Flowers", plannedCents: 95_000 }),
    ]);
    expect(Object.keys(groups).sort()).toEqual(["Flowers", "Venue"]);
    expect(groups.Venue.plannedCents).toBe(900_000);
  });
});

describe("upcomingPayments", () => {
  it("returns overdue and in-window items with money still owed, soonest first", () => {
    const rows = [
      item({ name: "Overdue", dueDate: "2026-02-20", plannedCents: 50_000 }),
      item({ name: "Soon", dueDate: "2026-03-10", plannedCents: 50_000 }),
      item({ name: "Far", dueDate: "2026-09-01", plannedCents: 50_000 }),
      item({ name: "Settled", dueDate: "2026-03-05", plannedCents: 50_000, paidCents: 50_000 }),
      item({ name: "Undated", plannedCents: 50_000 }),
    ];
    expect(upcomingPayments(rows, 30, FROM).map((row) => row.name)).toEqual(["Overdue", "Soon"]);
  });
});
