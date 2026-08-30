"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";

type GuestResult = { guests: Doc<"guests">[]; totalHeadcount: number } | undefined;
type GuestForm = { name: string; partySize: string; notes: string };

const emptyForm = (): GuestForm => ({ name: "", partySize: "1", notes: "" });
const formFor = (guest: Doc<"guests">): GuestForm => ({
  name: guest.name,
  partySize: String(guest.partySize),
  notes: guest.notes ?? "",
});

export function GuestList({ weddingId, result }: { weddingId: Id<"weddings">; result: GuestResult }) {
  const summary = headcountSummary(result);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Guests</h1>
        <p className="mt-1 text-stone-500">A simple headcount for the people you plan to invite.</p>
      </div>
      <Headcount total={summary.total} invitationLabel={summary.invitationLabel} />
      <AddGuest weddingId={weddingId} />
      <InvitationList result={result} />
    </div>
  );
}

function Headcount({ total, invitationLabel }: { total: string | number; invitationLabel: string }) {
  return (
    <Card className="flex items-end justify-between gap-4 bg-rose-50">
      <div>
        <CardHint>Planned headcount</CardHint>
        <p className="text-4xl font-semibold text-stone-900">{total}</p>
      </div>
      <p className="text-sm text-stone-600">{invitationLabel}</p>
    </Card>
  );
}

function AddGuest({ weddingId }: { weddingId: Id<"weddings"> }) {
  const createGuest = useMutation(api.guests.create);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<GuestForm>(emptyForm);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await createGuest({ weddingId, ...guestInput(form) });
      setForm(emptyForm());
      setAdding(false);
    } catch (cause) {
      setError(errorMessage(cause, "Could not add that guest"));
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    setForm(emptyForm());
    setError(null);
    setAdding(false);
  }

  if (!adding) return <Button className="w-full" onClick={() => setAdding(true)}>Add guests</Button>;

  return (
    <Card>
      <CardTitle>New invitation</CardTitle>
      <GuestFormView
        form={form}
        setForm={setForm}
        error={error}
        pending={pending}
        submitLabel={pending ? "Adding…" : "Add invitation"}
        autoFocus
        onSubmit={submit}
        onCancel={cancel}
      />
    </Card>
  );
}

function InvitationList({ result }: { result: GuestResult }) {
  return (
    <section className="space-y-3">
      <CardTitle>Invitation list</CardTitle>
      {result === undefined ? <p className="text-sm text-stone-500">Loading…</p> : null}
      {result?.guests.length === 0 ? (
        <EmptyState title="No guests yet" hint="Add the first person or household you want to invite." />
      ) : null}
      {result?.guests.map((guest) => <GuestCard key={guest._id} guest={guest} />)}
    </section>
  );
}

function GuestCard({ guest }: { guest: Doc<"guests"> }) {
  const [editing, setEditing] = useState(false);
  return editing
    ? <EditGuest guest={guest} onClose={() => setEditing(false)} />
    : <GuestSummary guest={guest} onEdit={() => setEditing(true)} />;
}

function EditGuest({ guest, onClose }: { guest: Doc<"guests">; onClose: () => void }) {
  const updateGuest = useMutation(api.guests.update);
  const [form, setForm] = useState<GuestForm>(() => formFor(guest));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await updateGuest({ guestId: guest._id, ...guestInput(form) });
      onClose();
    } catch (cause) {
      setError(errorMessage(cause, "Could not save those changes"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <GuestFormView
        form={form}
        setForm={setForm}
        error={error}
        pending={pending}
        submitLabel={pending ? "Saving…" : "Save"}
        onSubmit={save}
        onCancel={onClose}
      />
    </Card>
  );
}

function GuestSummary({ guest, onEdit }: { guest: Doc<"guests">; onEdit: () => void }) {
  const removeGuest = useMutation(api.guests.remove);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (pending || !window.confirm(`Remove ${guest.name} from the guest list?`)) return;
    setPending(true);
    setError(null);
    try {
      await removeGuest({ guestId: guest._id });
    } catch (cause) {
      setError(errorMessage(cause, "Could not remove that guest"));
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 break-words">
        <p className="font-medium">{guest.name}</p>
        <GuestDetails guest={guest} />
        <ErrorMessage error={error} className="mt-1" />
      </div>
      <div className="flex shrink-0 gap-2 sm:w-auto">
        <Button className="h-12 flex-1 sm:flex-none" variant="secondary" disabled={pending} onClick={onEdit}>
          Edit
        </Button>
        <Button className="h-12 flex-1 sm:flex-none" variant="danger" disabled={pending} onClick={remove}>
          {pending ? "Removing…" : "Remove"}
        </Button>
      </div>
    </Card>
  );
}

function GuestDetails({ guest }: { guest: Doc<"guests"> }) {
  const people = `${guest.partySize} ${guest.partySize === 1 ? "person" : "people"}`;
  return <p className="text-sm text-stone-500">{people}{guest.notes ? ` · ${guest.notes}` : ""}</p>;
}

type FormViewProps = {
  form: GuestForm;
  setForm: React.Dispatch<React.SetStateAction<GuestForm>>;
  error: string | null;
  pending: boolean;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
};

function GuestFormView(props: FormViewProps) {
  return (
    <form className="mt-3 space-y-3" onSubmit={props.onSubmit}>
      <GuestFields form={props.form} setForm={props.setForm} autoFocus={props.autoFocus} />
      <ErrorMessage error={props.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={props.pending}>{props.submitLabel}</Button>
        <Button type="button" variant="ghost" disabled={props.pending} onClick={props.onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function GuestFields({ form, setForm, autoFocus }: Pick<FormViewProps, "form" | "setForm" | "autoFocus">) {
  return (
    <>
      <Field label="Name or household">
        <Input required autoFocus={autoFocus} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </Field>
      <Field label="Number of people">
        <Input required type="number" min="1" max="100" step="1" value={form.partySize} onChange={(event) => setForm({ ...form, partySize: event.target.value })} />
      </Field>
      <Field label="Notes (optional)">
        <Input maxLength={500} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </Field>
    </>
  );
}

function ErrorMessage({ error, className = "" }: { error: string | null; className?: string }) {
  return error ? <p role="alert" className={`${className} text-sm text-red-700`}>{error}</p> : null;
}

function guestInput(form: GuestForm) {
  return { name: form.name, partySize: Number(form.partySize), notes: form.notes || undefined };
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

function headcountSummary(result: GuestResult) {
  if (!result) return { total: "—", invitationLabel: "Loading…" };
  const count = result.guests.length;
  const noun = count === 1 ? "invitation" : "invitations";
  return { total: result.totalHeadcount, invitationLabel: `${count} ${noun}` };
}
