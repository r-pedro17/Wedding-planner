"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardHint, CardTitle } from "@/components/ui/card";

const eveUrl = process.env.NEXT_PUBLIC_EVE_URL;

/**
 * Eve entry point, reachable from every screen. Eve itself runs on the `eve`
 * framework in `agent/` and reads and writes the same Convex data through the
 * tools in `agent/tools/`. The app stays fully usable without opening this.
 */
export function EvePanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="fixed bottom-5 right-5 shadow-lg"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? "Close Eve" : "Ask Eve"}
      </Button>

      {open ? (
        <div className="fixed inset-x-3 bottom-24 z-10 mx-auto max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
          {eveUrl ? (
            <iframe title="Eve" src={eveUrl} className="h-[60dvh] w-full" />
          ) : (
            <div className="space-y-2 p-5">
              <CardTitle>Eve is not connected yet</CardTitle>
              <CardHint>
                Run <code>pnpm exec eve dev</code> and set <code>NEXT_PUBLIC_EVE_URL</code> to the
                agent&apos;s channel URL. Everything in the app works without Eve.
              </CardHint>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
