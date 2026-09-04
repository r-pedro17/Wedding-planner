# Security

## Supported version

Wedding Planner is a private-use V1 application. Only the current `main` branch
and its deployment at `wedding.ragoczypedro.nl` are maintained.

## Report a vulnerability

Do not open a public issue containing credentials, personal wedding data, or a
reproduction that exposes another user's data. Contact the repository owner
privately through their GitHub profile and include the affected route or Convex
function, impact, and a minimal reproduction. Rotate an exposed credential
before investigating its history.

## Trust boundaries

- Clerk authenticates people and issues the `convex` JWT. Convex verifies the
  issuer and audience; Clerk UI state is not an authorization decision.
- Convex is the authorization and data boundary. Every wedding-owned row carries
  `weddingId`, and every wedding-scoped read and write must establish the caller's
  membership server-side before accessing it. Client-provided user IDs or
  wedding IDs are never proof of access.
- Vercel serves the Next.js UI. Browser-visible `NEXT_PUBLIC_*` values are public
  configuration, not secrets. Server credentials belong in provider-managed
  environment variables and must not be committed.
- Hostinger DNS and Vercel project access are deployment administration. Their
  tokens are not application runtime dependencies and must never enter CI or the
  browser bundle.
- Eve is an additional operator surface, not a separate authority. Today its
  production browser authentication and delegated Convex identity are unproven;
  it is not part of the current stabilization claim.

### Target boundaries

- Eve must authenticate each production request with a short-lived Clerk
  credential and call Convex as the initiating person. The two hops have explicit
  issuers and audiences and use supported adapters or exchange mechanisms. A
  token minted for Eve must not be reused as a Convex-audience token. Convex
  remains the final membership boundary; Eve is not a permanent wedding member.
- Axiom may receive privacy-minimal operational telemetry from Next.js, the
  browser, and Eve. It is not a wedding datastore or audit log and must not
  receive wedding content, credentials, prompts, contacts, user-supplied
  wedding/due dates, notes, or amounts. Operational timestamps are allowed.
- Convex `auditEvents` will be immutable wedding records written transactionally
  with important mutations. They remain inside the wedding authorization
  boundary.

## Required controls

- Keep `.env.local`, API tokens, JWTs, private keys, and provider credentials out
  of Git. `.env.example` contains names and empty placeholders only.
- The Clerk JWT template named `convex` must use `{"aud":"convex"}`. Set
  `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment, not in browser config.
- Treat authorization tests as negative tests: prove anonymous callers and
  authenticated non-members cannot read or write a wedding. Also prove owner and
  partner access and deny cross-wedding vendor, task, budget, guest, membership,
  and audit references.
- Prefer purpose-specific Convex functions with validated arguments and returns.
  Avoid public functions for internal-only operations.
- Production Eve requests must verify issuer, audience, signature, and expiry,
  preserve identity per request/tool execution, and use a request-scoped Convex
  client. A permanent `CONVEX_AGENT_TOKEN` or couple token is prohibited.
- Enforce and test CSP, HSTS in production, Referrer-Policy,
  X-Content-Type-Options, Permissions-Policy, and framing restrictions. Permit
  only the minimum Clerk, Convex, Eve, Axiom, and hosting origins.
- Important successful mutations create a transactional audit event with a
  controlled action label, actor principal, source, entity reference, and
  timestamp. User events require an authenticated user id; system events do not
  invent a human actor. Rejected mutations create no success event.
- Audit source is derived from a trusted server-side function path and verified
  execution context, never a free public mutation argument. A delegated human
  token alone does not prove Eve provenance; ordinary UI callers must be unable
  to forge `eve` or `system` events.
- Telemetry uses safe structured categories and correlation ids, not raw request,
  form, exception, model, or tool payloads. Monitor delivery must be tested.
- Backup exports are sensitive production data. Restore drills use an isolated
  non-production deployment and verify critical counts and relationships.
- Ordinary CI runs without Clerk, Convex, Vercel, Hostinger, or Eve secrets. It
  installs from the frozen lockfile and independently reports quality, Fallow
  changed-code findings, production dependency advisories, and full-tree
  advisories.
- Dependency and structural analysis are defenses in depth. They do not replace
  authorization review, integration tests, or browser-flow verification.

## Data handling

Wedding names, dates, partner identities, vendor contact details, budgets, and
notes are private user data. Store only what the product needs, expose it only
through wedding-scoped Convex functions, and avoid copying real records into
issues, CI logs, screenshots, fixtures, or agent transcripts. Do not place card
numbers, bank credentials, identity documents, passwords, or provider tokens in
notes; the application is not a vault for those secrets.

Deletion, retention, export, backup, and restore behavior must be established
and tested before treating the service as a durable system of record. A provider
backup setting is not recovery evidence until a restore has been rehearsed.

Audit records deliberately exclude wedding content and full document snapshots.
Operational telemetry and audit history have separate purposes and retention;
neither may be used as a hidden copy of wedding state.

## Deployment and incident response

Vercel deploys the connected `main` branch. Before merging, require a green
quality run and review dependency and Fallow results. After a security-relevant
change, verify owner, partner, anonymous, and unrelated authenticated flows plus
cross-wedding reference denial against the intended environment. Identify and
announce a Convex deployment before any export, import, or deploy; production
recovery actions require fresh explicit approval.

If a credential or session token is exposed: revoke or rotate it at its provider,
remove it from the runtime environment, inspect Git history and CI logs for its
reach, then redeploy. Rewriting history does not revoke a credential.

## Known gaps

The repository has automated pure-domain tests but does not yet have complete
Convex function authorization tests or end-to-end browser coverage. Eve still has placeholder browser
authentication and an environment-level Convex token rather than proven
request-scoped delegation. Durable audit events, privacy-reviewed production
telemetry with tested monitors, and a proved backup/restore drill are not yet in
place.
Branch-rule enforcement depends on the GitHub repository plan and settings;
workflows provide evidence but may not technically prevent a direct push. These
are proof gaps, not completed controls; product-flow gaps remain centralized in
`docs/BUILD_PLAN.md`.
