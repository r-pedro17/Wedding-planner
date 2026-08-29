"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWedding } from "@/components/use-wedding";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { formatCents, parseAmountToCents } from "@/convex/lib/money";
import { YourUserId } from "@/components/your-user-id";

export default function SettingsPage() {
  const wedding = useWedding();
  const createWedding = useMutation(api.weddings.create);
  const updateWedding = useMutation(api.weddings.update);
  const addMember = useMutation(api.weddings.addMember);
  const members = useQuery(api.weddings.members, wedding ? { weddingId: wedding._id } : "skip");

  const [form, setForm] = useState({ name: "", weddingDate: "", budget: "" });
  const [partnerId, setPartnerId] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (wedding === undefined) return <p className="text-stone-500">Loading…</p>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError(null);
      const totalBudgetCents = parseAmountToCents(form.budget);
      if (wedding) {
        await updateWedding({
          weddingId: wedding._id,
          name: form.name.trim() || wedding.name,
          weddingDate: form.weddingDate || wedding.weddingDate,
          totalBudgetCents,
        });
      } else {
        await createWedding({
          name: form.name.trim(),
          weddingDate: form.weddingDate || undefined,
          totalBudgetCents,
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save");
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardTitle>{wedding ? "Your wedding" : "Create your wedding"}</CardTitle>
        {wedding ? (
          <CardHint className="mt-1">
            {wedding.name}
            {wedding.weddingDate ? ` · ${wedding.weddingDate}` : ""} ·{" "}
            {formatCents(wedding.totalBudgetCents, wedding.currency)} total budget
          </CardHint>
        ) : null}
        <form className="mt-3 space-y-3" onSubmit={submit}>
          <Field label="Wedding name">
            <Input
              required={!wedding}
              placeholder={wedding?.name ?? "Alex & Sam"}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Wedding date">
            <Input
              type="date"
              value={form.weddingDate}
              onChange={(e) => setForm({ ...form, weddingDate: e.target.value })}
            />
          </Field>
          <Field label="Total budget">
            <Input
              required
              inputMode="decimal"
              placeholder="25000"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
          </Field>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button type="submit">{wedding ? "Save changes" : "Create wedding"}</Button>
        </form>
      </Card>

      {wedding ? (
        <Card>
          <CardTitle>Who can see this</CardTitle>
          <CardHint className="mt-1">
            Both of you can manage everything. Add your partner with their Clerk user id.
          </CardHint>
          <YourUserId />
          <ul className="mt-3 space-y-1 text-sm text-stone-600">
            {members?.map((member) => (
              <li key={member._id}>
                {member.clerkUserId} — {member.role}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="user_123…"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            />
            <Button
              disabled={partnerId.trim() === ""}
              onClick={async () => {
                await addMember({ weddingId: wedding._id, clerkUserId: partnerId.trim() });
                setPartnerId("");
              }}
            >
              Add
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
