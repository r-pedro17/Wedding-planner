import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Eve talks to the same Convex deployment as the UI, as a real member of the
 * wedding. `CONVEX_AGENT_TOKEN` is a Clerk JWT for the signed-in couple; without
 * it every wedding-scoped call is rejected by `convex/lib/auth.ts`.
 */
export function convexClient(): ConvexHttpClient {
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("CONVEX_URL is not set — Eve cannot reach the wedding data.");
  const client = new ConvexHttpClient(url);
  const token = process.env.CONVEX_AGENT_TOKEN;
  if (token) client.setAuth(token);
  return client;
}

/** The wedding Eve is working on. Every tool resolves this, never guesses it. */
export async function currentWedding(client: ConvexHttpClient) {
  const wedding = await client.query(api.weddings.current, {});
  if (!wedding) {
    throw new Error("No wedding is set up yet. Ask the couple to create one in Settings.");
  }
  return wedding;
}

export async function requireWeddingId(client: ConvexHttpClient): Promise<Id<"weddings">> {
  return (await currentWedding(client))._id;
}

export { api };
