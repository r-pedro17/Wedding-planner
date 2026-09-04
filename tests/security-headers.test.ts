import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  clerkFrontendOrigin,
  convexConnectOrigins,
  securityHeaders,
  type SecurityHeaderEnv,
} from "../lib/security-headers";

// pk_test_ for "example.clerk.accounts.dev$" (base64), the shape Clerk emits.
const CLERK_KEY = `pk_test_${btoa("example.clerk.accounts.dev$")}`;
const CONVEX_URL = "https://calm-otter-123.convex.cloud";

const prodEnv: SecurityHeaderEnv = {
  convexUrl: CONVEX_URL,
  clerkPublishableKey: CLERK_KEY,
  production: true,
};

function directives(env: SecurityHeaderEnv): Map<string, string> {
  return new Map(
    buildContentSecurityPolicy(env)
      .split("; ")
      .map((part) => {
        const [name, ...rest] = part.split(" ");
        return [name, rest.join(" ")] as const;
      }),
  );
}

describe("clerkFrontendOrigin", () => {
  it("decodes the frontend API origin from a publishable key", () => {
    expect(clerkFrontendOrigin(CLERK_KEY)).toBe("https://example.clerk.accounts.dev");
  });

  it("returns null when the key is missing or malformed", () => {
    expect(clerkFrontendOrigin(undefined)).toBeNull();
    expect(clerkFrontendOrigin("pk_test_")).toBeNull();
    expect(clerkFrontendOrigin("pk_live_%%%not-base64%%%")).toBeNull();
  });
});

describe("convexConnectOrigins", () => {
  it("yields the https and wss origins for realtime sync", () => {
    expect(convexConnectOrigins(CONVEX_URL)).toEqual([
      "https://calm-otter-123.convex.cloud",
      "wss://calm-otter-123.convex.cloud",
    ]);
  });

  it("is empty when Convex is unconfigured", () => {
    expect(convexConnectOrigins(undefined)).toEqual([]);
  });
});

describe("buildContentSecurityPolicy", () => {
  it("forbids framing", () => {
    expect(directives(prodEnv).get("frame-ancestors")).toBe("'none'");
  });

  it("names the derived Convex and Clerk origins", () => {
    const csp = directives(prodEnv);
    expect(csp.get("connect-src")).toContain("wss://calm-otter-123.convex.cloud");
    expect(csp.get("connect-src")).toContain("https://example.clerk.accounts.dev");
    expect(csp.get("frame-src")).toContain("https://challenges.cloudflare.com");
  });

  it("omits Clerk/Convex origins when unconfigured but stays a valid policy", () => {
    const csp = directives({ production: true });
    expect(csp.get("default-src")).toBe("'self'");
    expect(csp.get("connect-src")).toBe(
      "'self' https://clerk-telemetry.com https://*.clerk-telemetry.com",
    );
    expect(csp.get("frame-ancestors")).toBe("'none'");
  });

  it("allows unsafe-eval only outside production", () => {
    expect(directives({ production: false }).get("script-src")).toContain("'unsafe-eval'");
    expect(directives(prodEnv).get("script-src")).not.toContain("'unsafe-eval'");
  });
});

describe("securityHeaders", () => {
  it("emits the full policy set with framing locked down", () => {
    const byKey = new Map(securityHeaders(prodEnv).map((h) => [h.key, h.value]));
    expect(byKey.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byKey.get("X-Frame-Options")).toBe("DENY");
    expect(byKey.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(byKey.get("Permissions-Policy")).toContain("geolocation=()");
    expect(byKey.has("Content-Security-Policy")).toBe(true);
  });

  it("switches to report-only delivery when asked", () => {
    const enforce = securityHeaders(prodEnv).map((h) => h.key);
    expect(enforce).toContain("Content-Security-Policy");
    const report = securityHeaders({ ...prodEnv, reportOnly: true }).map((h) => h.key);
    expect(report).toContain("Content-Security-Policy-Report-Only");
    expect(report).not.toContain("Content-Security-Policy");
  });

  it("pins HSTS only in production", () => {
    const prod = securityHeaders(prodEnv).find((h) => h.key === "Strict-Transport-Security");
    expect(prod?.value).toContain("includeSubDomains");
    expect(securityHeaders({ production: false }).some((h) => h.key === "Strict-Transport-Security")).toBe(
      false,
    );
  });
});
