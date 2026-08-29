"use client";

import type { ReactNode } from "react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/**
 * Wedding data is per-account, so nothing that reads it renders until Clerk has
 * a session. With no Clerk keys the app runs unauthenticated for local work.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  if (!clerkConfigured) return <>{children}</>;

  return (
    <>
      <AuthLoading>
        <p className="text-stone-500">Loading…</p>
      </AuthLoading>
      <Authenticated>{children}</Authenticated>
      <Unauthenticated>
        <Card className="text-center">
          <CardTitle>Sign in to your wedding</CardTitle>
          <CardHint className="mt-1">
            Your budget, tasks and vendors live in your account — and your partner&apos;s.
          </CardHint>
          <div className="mt-4">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        </Card>
      </Unauthenticated>
    </>
  );
}
