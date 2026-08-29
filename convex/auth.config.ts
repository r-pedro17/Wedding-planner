/**
 * Tells Convex which JWTs to trust. If this is missing or wrong, Convex trusts
 * nobody: every request is anonymous and the app is silently signed-out with no
 * error anywhere.
 *
 * `CLERK_JWT_ISSUER_DOMAIN` is the Issuer URL of the Clerk JWT template named
 * "convex". It is set on the Convex deployment, not in `.env.local`:
 *
 *   pnpm exec convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
 *
 * Convex refuses to push while it is unset.
 */
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
