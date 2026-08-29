"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { parseAmountToCents } from "@/convex/lib/money";

const CATEGORIES = ["Venue", "Catering", "Photography", "Music", "Flowers", "Attire", "Other"];

export function AddBudgetItemForm({ weddingId }: { weddingId: Id<"weddings"> }) {
  const addItem = useMutation(api.budgets.addItem);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0], planned: "", dueDate: "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError(null);
      await addItem({
        weddingId,
        name: form.name.trim(),
        category: form.category,
        plannedCents: parseAmountToCents(form.planned),
        dueDate: form.dueDate || undefined,
      });
      setForm({ name: "", category: CATEGORIES[0], planned: "", dueDate: "" });
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add that item");
    }
  }

  if (!open) {
    return (
      <Button className="w-full" onClick={() => setOpen(true)}>
        Add a budget item
      </Button>
    );
  }

  return (
    <Card>
      <CardTitle>New budget item</CardTitle>
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <Field label="What is it?">
          <Input
            required
            value={form.name}
            placeholder="Photographer"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </Select>
        </Field>
        <Field label="Planned amount">
          <Input
            required
            inputMode="decimal"
            placeholder="1800"
            value={form.planned}
            onChange={(e) => setForm({ ...form, planned: e.target.value })}
          />
        </Field>
        <Field label="Due date (optional)">
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit">Save item</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
