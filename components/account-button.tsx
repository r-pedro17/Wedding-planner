"use client";

import { UserButton } from "@clerk/nextjs";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** Avatar + sign-out, in the nav on every screen. Hidden when Clerk is off. */
export function AccountButton() {
  if (!clerkConfigured) return null;
  return (
    <div className="ml-auto pl-2">
      <UserButton />
    </div>
  );
}
