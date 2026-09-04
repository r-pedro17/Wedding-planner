import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security-headers";

const headers = securityHeaders({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  production: process.env.NODE_ENV === "production",
  // Enforcing. The policy was proven clean against live Clerk sign-in and Convex
  // realtime in report-only mode. Set CSP_REPORT_ONLY=1 to revert to reporting.
  reportOnly: process.env.CSP_REPORT_ONLY === "1",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
