"use client";

import { useUser } from "@clerk/nextjs";
import { CardHint } from "@/components/ui/card";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function UserId() {
  const { user } = useUser();
  if (!user) return null;
  return (
    <CardHint className="mt-2">
      Your own id, to send to your partner: <code>{user.id}</code>
    </CardHint>
  );
}

/** Shown in Settings so one of you can add the other. */
export function YourUserId() {
  if (!clerkConfigured) return null;
  return <UserId />;
}
