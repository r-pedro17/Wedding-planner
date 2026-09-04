/**
 * Production security-header policy (F2, docs/BUILD_PLAN.md:74).
 *
 * The Content Security Policy is a static, per-deployment allowlist delivered by
 * `next.config.ts` `headers()`. It is not nonce-based on purpose: a nonce forces
 * every route to render dynamically, and the app must keep prerendering its
 * static routes (AGENTS.md). The cost is `'unsafe-inline'` in `script-src` for
 * Next's inline bootstrap — the same trade-off Clerk's own CSP helper makes.
 *
 * Origins are derived from the public env so the policy stays minimal per
 * deployment. When Clerk/Convex are unconfigured the app mounts neither, so
 * their origins are simply absent — the bundle loads nothing that needs them.
 *
 * Eve and Axiom (BUILD_PLAN F5) are not wired into the browser bundle yet; when
 * they are, add their origins to `connect-src` here.
 */

export type SecurityHeaderEnv = {
  convexUrl?: string;
  clerkPublishableKey?: string;
  production?: boolean;
  /**
   * Deliver the CSP as `Content-Security-Policy-Report-Only` so violations are
   * logged by the browser without blocking. Used to prove a policy against live
   * flows before enforcing it (BUILD_PLAN F2).
   */
  reportOnly?: boolean;
};

export type Header = { key: string; value: string };

/**
 * A Clerk publishable key is `pk_(test|live)_<base64(frontend-api-domain + "$")>`.
 * Decoding it yields the exact Frontend API origin clerk-js talks to, so the CSP
 * can name that host instead of a wildcard.
 */
export function clerkFrontendOrigin(key?: string): string | null {
  if (!key) return null;
  const encoded = key.replace(/^pk_(test|live)_/, "");
  if (!encoded) return null;
  let domain: string;
  try {
    domain = atob(encoded).replace(/\$$/, "");
  } catch {
    return null;
  }
  return domain ? `https://${domain}` : null;
}

/**
 * Convex opens a WebSocket for realtime sync and XHRs to the same deployment
 * host, so `connect-src` needs both the `https:` and `wss:` origins.
 */
export function convexConnectOrigins(url?: string): string[] {
  if (!url) return [];
  const origin = url.replace(/\/$/, "");
  return [origin, origin.replace(/^https:/, "wss:")];
}

function cspDirectives(env: SecurityHeaderEnv): Record<string, string[]> {
  const clerk = clerkFrontendOrigin(env.clerkPublishableKey);
  const clerkOrigins = clerk ? [clerk] : [];
  const turnstile = "https://challenges.cloudflare.com";
  const scriptDev = env.production ? [] : ["'unsafe-eval'"];

  return {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...scriptDev, turnstile, ...clerkOrigins],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://img.clerk.com", ...clerkOrigins],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...convexConnectOrigins(env.convexUrl),
      "https://clerk-telemetry.com",
      "https://*.clerk-telemetry.com",
      ...clerkOrigins,
    ],
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'self'", turnstile, ...clerkOrigins],
  };
}

export function buildContentSecurityPolicy(env: SecurityHeaderEnv): string {
  return Object.entries(cspDirectives(env))
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");
}

/**
 * The full production header set. HSTS is emitted only in production so a plain
 * `http://localhost` dev origin is never pinned to HTTPS.
 */
export function securityHeaders(env: SecurityHeaderEnv): Header[] {
  const cspKey = env.reportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
  const headers: Header[] = [
    { key: cspKey, value: buildContentSecurityPolicy(env) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];
  if (env.production) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }
  return headers;
}
