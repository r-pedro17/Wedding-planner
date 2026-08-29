"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWedding } from "@/components/use-wedding";
import { AddBudgetItemForm } from "@/components/budget/add-budget-item-form";
import { BudgetItemCard } from "@/components/budget/budget-item-card";
import { BudgetSummary } from "@/components/budget/budget-summary";
import { EmptyState } from "@/components/ui/empty-state";

export default function BudgetPage() {
  const wedding = useWedding();
  const budget = useQuery(api.budgets.list, wedding ? { weddingId: wedding._id } : "skip");

  if (wedding === undefined) return <p className="text-stone-500">Loading…</p>;
  if (wedding === null) return <EmptyState title="Create your wedding in Settings first" />;
  if (budget === undefined) return <p className="text-stone-500">Loading…</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Budget</h1>
      <BudgetSummary totals={budget.totals} currency={budget.currency} />
      <AddBudgetItemForm weddingId={wedding._id} />
      {budget.items.length === 0 ? (
        <EmptyState title="No budget items yet" hint="Start with the big ones: venue, catering, photos." />
      ) : (
        <div className="space-y-3">
          {budget.items.map((item) => (
            <BudgetItemCard key={item._id} item={item} currency={budget.currency} />
          ))}
        </div>
      )}
    </div>
  );
}
