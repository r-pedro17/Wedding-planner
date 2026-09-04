"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CardHint } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

type Member = { clerkUserId: string; role: string };

function AddPartnerControl({ weddingId }: { weddingId: Id<"weddings"> }) {
  const addMember = useMutation(api.weddings.addMember);
  const [partnerId, setPartnerId] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <>
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
              await addMember({ weddingId, clerkUserId: partnerId.trim() });
              setPartnerId("");
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not add partner");
            }
          }}
        >
          Add
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function roleOf(members: Member[] | undefined, clerkUserId: string | undefined) {
  if (!members || !clerkUserId) return undefined;
  return members.find((member) => member.clerkUserId === clerkUserId)?.role;
}

function OwnerOnlyAddPartner({
  weddingId,
  members,
}: {
  weddingId: Id<"weddings">;
  members: Member[] | undefined;
}) {
  const { user } = useUser();
  if (roleOf(members, user?.id) !== "owner") return null;
  return <AddPartnerControl weddingId={weddingId} />;
}

/** The add-partner control, shown only to the wedding owner. */
export function AddPartner(props: { weddingId: Id<"weddings">; members: Member[] | undefined }) {
  if (!clerkConfigured) return null;
  return <OwnerOnlyAddPartner {...props} />;
}

export function AddPartnerHint({ members }: { members: Member[] | undefined }) {
  return (
    <CardHint className="mt-1">
      Both of you can manage everything.{" "}
      {members && members.length > 1
        ? "Your partner is already on this wedding."
        : "The wedding owner can add a partner with their Clerk user id."}
    </CardHint>
  );
}
