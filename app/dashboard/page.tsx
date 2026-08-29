"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWedding } from "@/components/use-wedding";
import { BudgetSummary } from "@/components/budget/budget-summary";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/convex/lib/money";
import { formatDateOnly } from "@/convex/lib/dates";

export default function DashboardPage() {
  const wedding = useWedding();
  const summary = useQuery(api.weddings.summary, wedding ? { weddingId: wedding._id } : "skip");

  if (wedding === undefined) return <p className="text-stone-500">Loading…</p>;
  if (wedding === null) {
    return (
      <EmptyState
        title="No wedding set up yet"
        hint={
          <Link className="underline" href="/settings">
            Create your wedding in Settings
          </Link>
        }
      />
    );
  }
  if (summary === undefined) return <p className="text-stone-500">Loading…</p>;

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>{summary.wedding.name}</CardTitle>
        {summary.wedding.weddingDate ? (
          <>
            <p className="mt-1 text-3xl font-semibold">
              {summary.wedding.daysUntil !== null && summary.wedding.daysUntil >= 0
                ? `${summary.wedding.daysUntil} days to go`
                : "The big day has passed"}
            </p>
            <CardHint>{formatDateOnly(summary.wedding.weddingDate)}</CardHint>
          </>
        ) : (
          <CardHint>
            No date yet —{" "}
            <Link className="underline" href="/settings">
              add one
            </Link>
            .
          </CardHint>
        )}
      </Card>

      <BudgetSummary totals={summary.totals} currency={summary.wedding.currency} />

      <Card>
        <CardTitle>Upcoming payments</CardTitle>
        {summary.upcomingPayments.length === 0 ? (
          <CardHint className="mt-2">Nothing due in the next 30 days.</CardHint>
        ) : (
          <ul className="mt-3 space-y-2">
            {summary.upcomingPayments.map((item) => (
              <li key={item._id} className="flex justify-between gap-3 rounded-xl bg-stone-50 p-3">
                <span>{item.name}</span>
                <span className="tabular-nums text-stone-600">
                  {item.dueDate ? formatDateOnly(item.dueDate) : ""} ·{" "}
                  {formatCents(
                    (item.committedCents ?? item.plannedCents) - item.paidCents,
                    summary.wedding.currency,
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="ghost" size="sm" className="mt-3 px-0">
          <Link href="/budget">Open budget</Link>
        </Button>
      </Card>

      <Card>
        <CardTitle>Tasks needing attention</CardTitle>
        <CardHint className="mt-1">
          {summary.counts.openTasks} open · {summary.counts.overdueTasks} overdue
        </CardHint>
        {summary.upcomingTasks.length === 0 ? (
          <CardHint className="mt-2">Nothing scheduled.</CardHint>
        ) : (
          <ul className="mt-3 space-y-2">
            {summary.upcomingTasks.map((task) => (
              <li key={task._id} className="flex justify-between gap-3 rounded-xl bg-stone-50 p-3">
                <span>{task.title}</span>
                <span className="text-stone-600">{task.dueDate ? formatDateOnly(task.dueDate) : ""}</span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="ghost" size="sm" className="mt-3 px-0">
          <Link href="/planner">Open planner</Link>
        </Button>
      </Card>
    </div>
  );
}
