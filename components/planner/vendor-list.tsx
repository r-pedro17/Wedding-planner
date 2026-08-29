"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/input";

const STATUSES = ["considering", "contacted", "booked", "declined"] as const;
const tone: Record<(typeof STATUSES)[number], BadgeTone> = {
  considering: "neutral",
  contacted: "warn",
  booked: "good",
  declined: "bad",
};

export function VendorList({ weddingId }: { weddingId: Id<"weddings"> }) {
  const vendors = useQuery(api.vendors.list, { weddingId });
  const addVendor = useMutation(api.vendors.add);
  const updateVendor = useMutation(api.vendors.update);
  const [form, setForm] = useState({ name: "", category: "", contact: "" });
  const [open, setOpen] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await addVendor({
      weddingId,
      name: form.name.trim(),
      category: form.category.trim() || "Other",
      contactName: form.contact.trim() || undefined,
    });
    setForm({ name: "", category: "", contact: "" });
    setOpen(false);
  }

  return (
    <section className="space-y-3">
      <CardTitle>Vendors</CardTitle>
      {vendors === undefined ? <p className="text-sm text-stone-500">Loading…</p> : null}
      {vendors?.length === 0 ? <EmptyState title="No vendors yet" hint="Add the people you are talking to." /> : null}
      {vendors?.map((vendor) => (
        <Card key={vendor._id} className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">{vendor.name}</p>
            <p className="text-sm text-stone-500">
              {vendor.category}
              {vendor.contactName ? ` · ${vendor.contactName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={tone[vendor.status]}>{vendor.status}</Badge>
            <Select
              className="h-9 w-36 py-0 text-sm"
              value={vendor.status}
              onChange={(e) =>
                updateVendor({ vendorId: vendor._id, status: e.target.value as (typeof STATUSES)[number] })
              }
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
        </Card>
      ))}

      {open ? (
        <Card>
          <form className="space-y-3" onSubmit={submit}>
            <Field label="Vendor name">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Type">
              <Input
                placeholder="Photography"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </Field>
            <Field label="Contact (optional)">
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit">Save vendor</Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
          Add a vendor
        </Button>
      )}
    </section>
  );
}
