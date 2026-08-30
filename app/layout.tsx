import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { EvePanel } from "@/components/eve/eve-panel";
import { AuthGate } from "@/components/auth-gate";
import { AccountButton } from "@/components/account-button";

export const metadata: Metadata = {
  title: "Wedding Planner",
  description: "One calm place to run one wedding.",
};

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/budget", label: "Budget" },
  { href: "/planner", label: "Planner" },
  { href: "/guests", label: "Guests" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions (dark-mode toggles and the like) add attributes to
    // <html> before React hydrates; only attributes on this element are
    // suppressed, so real mismatches inside the app still warn.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>
          <header className="border-b border-stone-200 bg-white">
            <nav className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto p-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-4 py-2 text-base font-medium text-stone-700 hover:bg-stone-100"
                >
                  {item.label}
                </Link>
              ))}
              <AccountButton />
            </nav>
          </header>
          <main className="mx-auto max-w-3xl space-y-6 p-4 pb-28">
            <AuthGate>{children}</AuthGate>
          </main>
          <EvePanel />
        </Providers>
      </body>
    </html>
  );
}
