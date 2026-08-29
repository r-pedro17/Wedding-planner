"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

export function AddTaskForm({ weddingId }: { weddingId: Id<"weddings"> }) {
  const createTask = useMutation(api.tasks.create);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", dueDate: "", owner: "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError(null);
      await createTask({
        weddingId,
        title: form.title.trim(),
        dueDate: form.dueDate || undefined,
        owner: form.owner.trim() || undefined,
      });
      setForm({ title: "", dueDate: "", owner: "" });
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add that task");
    }
  }

  if (!open) {
    return (
      <Button className="w-full" onClick={() => setOpen(true)}>
        Add a task
      </Button>
    );
  }

  return (
    <Card>
      <CardTitle>New task</CardTitle>
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <Field label="What needs doing?">
          <Input
            required
            placeholder="Choose flowers"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Due date (optional)">
          <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </Field>
        <Field label="Owner (optional)">
          <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit">Save task</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
