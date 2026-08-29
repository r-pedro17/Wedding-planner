"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatCents, parseAmountToCents } from "@/convex/lib/money";
import { dueState, formatDateOnly } from "@/convex/lib/dates";

const statusTone: Record<Doc<"budgetItems">["status"], BadgeTone> = {
  idea: "neutral",
  quoted: "neutral",
  booked: "warn",
  paid: "good",
};

export function BudgetItemCard({
  item,
  currency,
}: {
  item: Doc<"budgetItems"> & { remainingCents: number };
  currency: string;
}) {
  const recordPayment = useMutation(api.budgets.recordPayment);
  const removeItem = useMutation(api.budgets.removeItem);
  const [payment, setPayment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const overdue = dueState(item.dueDate) === "overdue" && item.remainingCents > 0;

  async function pay() {
    try {
      setError(null);
      await recordPayment({ itemId: item._id, amountCents: parseAmountToCents(payment) });
      setPayment("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not record that payment");
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{item.name}</p>
          <p className="text-sm text-stone-500">{item.category}</p>
        </div>
        <Badge tone={statusTone[item.status]}>{item.status}</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-stone-500">Planned</dt>
          <dd className="tabular-nums">{formatCents(item.plannedCents, currency)}</dd>
        </div>
        {item.quotedCents !== undefined ? (
          <div>
            <dt className="text-stone-500">Quoted</dt>
            <dd className="tabular-nums">{formatCents(item.quotedCents, currency)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-stone-500">Paid</dt>
          <dd className="tabular-nums">{formatCents(item.paidCents, currency)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Still to pay</dt>
          <dd className="font-medium tabular-nums">{formatCents(item.remainingCents, currency)}</dd>
        </div>
      </dl>

      {item.dueDate ? (
        <p className={overdue ? "text-sm font-medium text-red-700" : "text-sm text-stone-500"}>
          Due {formatDateOnly(item.dueDate)}
          {overdue ? " — overdue" : ""}
        </p>
      ) : null}

      {item.remainingCents > 0 ? (
        <div className="flex gap-2">
          <Input
            inputMode="decimal"
            placeholder="Record a payment"
            value={payment}
            onChange={(event) => setPayment(event.target.value)}
          />
          <Button onClick={pay} disabled={payment.trim() === ""}>
            Pay
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Button variant="danger" size="sm" onClick={() => removeItem({ itemId: item._id })}>
        Delete item
      </Button>
    </Card>
  );
}
