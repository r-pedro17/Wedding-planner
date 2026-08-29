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
- Eve is an additional operator surface, not a separate authority. Its tools
  must enforce the same Convex membership boundary as the normal UI. Eve is not
  part of the current stabilization claim.

## Required controls

- Keep `.env.local`, API tokens, JWTs, private keys, and provider credentials out
  of Git. `.env.example` contains names and empty placeholders only.
- The Clerk JWT template named `convex` must use `{"aud":"convex"}`. Set
  `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment, not in browser config.
- Treat authorization tests as negative tests: prove anonymous callers and
  authenticated non-members cannot read or write a wedding, including references
  to vendors or other rows owned by another wedding.
- Prefer purpose-specific Convex functions with validated arguments and returns.
  Avoid public functions for internal-only operations.
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

## Deployment and incident response

Vercel deploys the connected `main` branch. Before merging, require a green
quality run and review dependency and Fallow results. After a security-relevant
change, verify the authenticated flow and tenant-isolation negative case against
the intended environment.

If a credential or session token is exposed: revoke or rotate it at its provider,
remove it from the runtime environment, inspect Git history and CI logs for its
reach, then redeploy. Rewriting history does not revoke a credential.

## Known gaps

The repository has automated pure-domain tests but does not yet have complete
Convex function authorization tests or end-to-end browser coverage. There is no
proved backup/restore drill, production error-monitoring path, or explicit
Content Security Policy and security-header policy. Eve's runtime and machine
identity remain unproven and are outside the current stabilization claim.
Branch-rule enforcement depends on the GitHub repository plan and settings;
workflows provide evidence but may not technically prevent a direct push. These
are proof gaps, not completed controls; product-flow gaps remain centralized in
`docs/BUILD_PLAN.md`.
