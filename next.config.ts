import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security-headers";

const headers = securityHeaders({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  production: process.env.NODE_ENV === "production",
  // Report-only until the policy is proven against live flows. Set CSP_ENFORCE=1
  // in the deployment env to switch to an enforcing Content-Security-Policy.
  reportOnly: process.env.CSP_ENFORCE !== "1",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
