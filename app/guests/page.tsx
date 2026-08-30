"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWedding } from "@/components/use-wedding";
import { GuestList } from "@/components/guests/guest-list";
import { EmptyState } from "@/components/ui/empty-state";

export default function GuestsPage() {
  const wedding = useWedding();
  const result = useQuery(api.guests.list, wedding ? { weddingId: wedding._id } : "skip");

  if (wedding === undefined) return <p className="text-stone-500">Loading…</p>;
  if (wedding === null) return <EmptyState title="Create your wedding in Settings first" />;

  return <GuestList weddingId={wedding._id} result={result} />;
}
