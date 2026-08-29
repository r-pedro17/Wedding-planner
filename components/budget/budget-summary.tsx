"use client";

import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/convex/lib/money";
import type { BudgetTotals } from "@/convex/lib/budget";

export function BudgetSummary({ totals, currency }: { totals: BudgetTotals; currency: string }) {
  const rows: Array<[string, number]> = [
    ["Total budget", totals.totalBudgetCents],
    ["Planned", totals.plannedCents],
    ["Committed", totals.committedCents],
    ["Paid", totals.paidCents],
    ["Still to pay", totals.remainingCents],
    ["Unallocated", totals.unallocatedCents],
  ];

  return (
    <Card>
      <CardTitle>Money</CardTitle>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {rows.map(([label, cents]) => (
          <div key={label} className="rounded-xl bg-stone-50 p-3">
            <dt className="text-sm text-stone-500">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatCents(cents, currency)}</dd>
          </div>
        ))}
      </dl>
      {totals.overBudget ? (
        <CardHint className="mt-3 text-red-700">
          Planned spending is over the total budget by{" "}
          {formatCents(totals.plannedCents - totals.totalBudgetCents, currency)}.
        </CardHint>
      ) : null}
    </Card>
  );
}
