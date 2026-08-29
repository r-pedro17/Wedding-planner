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

  const [form, setForm] = useState<{ name: string; weddingDate: string; budget: string } | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (wedding === undefined) return <p className="text-stone-500">Loading…</p>;

  const currentForm = form ?? {
    name: wedding?.name ?? "",
    weddingDate: wedding?.weddingDate ?? "",
    budget: wedding ? (wedding.totalBudgetCents / 100).toFixed(2) : "",
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError(null);
      setSaved(false);
      const totalBudgetCents = parseAmountToCents(currentForm.budget);
      if (wedding) {
        await updateWedding({
          weddingId: wedding._id,
          name: currentForm.name.trim() || wedding.name,
          weddingDate: currentForm.weddingDate || wedding.weddingDate,
          totalBudgetCents,
        });
      } else {
        await createWedding({
          name: currentForm.name.trim(),
          weddingDate: currentForm.weddingDate || undefined,
          totalBudgetCents,
        });
      }
      setSaved(true);
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
              value={currentForm.name}
              onChange={(e) => setForm({ ...currentForm, name: e.target.value })}
            />
          </Field>
          <Field label="Wedding date">
            <Input
              type="date"
              value={currentForm.weddingDate}
              onChange={(e) => setForm({ ...currentForm, weddingDate: e.target.value })}
            />
          </Field>
          <Field label="Total budget">
            <Input
              required
              inputMode="decimal"
              placeholder="25000"
              value={currentForm.budget}
              onChange={(e) => setForm({ ...currentForm, budget: e.target.value })}
            />
          </Field>
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          {saved ? <p className="text-sm text-emerald-700" aria-live="polite">Saved.</p> : null}
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
                try {
                  setError(null);
                  await addMember({ weddingId: wedding._id, clerkUserId: partnerId.trim() });
                  setPartnerId("");
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "Could not add partner");
                }
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
