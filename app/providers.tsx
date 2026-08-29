"use client";

import { type ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <p className="font-semibold">Setup needed</p>
        <p className="mt-1 text-sm">
          Set <code>NEXT_PUBLIC_CONVEX_URL</code> in <code>.env.local</code> (run{" "}
          <code>pnpm exec convex dev</code>) and reload. See <code>.env.example</code>.
        </p>
      </div>
    </div>
  );
}

/**
 * The app renders without env vars: with no Convex URL we show a setup notice
 * instead of mounting anything that would call a Convex hook. Clerk is layered
 * on only when its key is present, so local work needs one service, not two.
 */
export function Providers({ children }: { children: ReactNode }) {
  const client = useMemo(() => (convexUrl ? new ConvexReactClient(convexUrl) : null), []);

  if (!client) return <SetupNotice />;

  if (!clerkKey) {
    return <ConvexProvider client={client}>{children}</ConvexProvider>;
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProviderWithClerk client={client} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
