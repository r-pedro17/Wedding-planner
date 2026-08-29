import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/**
 * Next.js 16 calls this file `proxy.ts` (`middleware.ts` on 15 and below).
 *
 * Routes are not blocked here: the app renders for signed-out visitors and the
 * `AuthGate` asks them to sign in, while Convex is the real access boundary —
 * every wedding-scoped function checks membership server-side. With no Clerk
 * keys this becomes a pass-through so the app still runs.
 */
export default clerkConfigured ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*[.](?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
