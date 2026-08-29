"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** The one wedding the signed-in user belongs to. `undefined` while loading. */
export function useWedding() {
  return useQuery(api.weddings.current);
}
