# Wedding Planner

A calm shared workspace for one couple to manage a wedding budget, tasks, and
vendors. The app uses Next.js, Clerk, and Convex; Convex is the source of truth.

Live app: [wedding.ragoczypedro.nl](https://wedding.ragoczypedro.nl)

## Local setup

Prerequisites: Node 24 (see `.node-version`) and pnpm 11.

```bash
pnpm install
cp .env.example .env.local
pnpm exec convex dev
pnpm dev
```

On Windows PowerShell, copy the environment template with
`Copy-Item .env.example .env.local`. If Node 24 is installed at `D:\node24` but
is not on `PATH`, run `$env:Path = 'D:\node24;' + $env:Path` first.

Fill in the Clerk and Convex values described in `.env.example`. Clerk must have
a JWT template named `convex` with `{"aud":"convex"}`, and the Convex deployment
must have `CLERK_JWT_ISSUER_DOMAIN` set to the Clerk issuer URL. The application
renders a setup notice rather than crashing when public environment variables
are absent.

Open [http://localhost:3000](http://localhost:3000), sign in, create a wedding,
then use Dashboard, Budget, Planner, and Settings.

## Verify

```bash
pnpm verify
pnpm fallow
```

Pull requests and `main` run the same clean-checkout quality contract in GitHub
Actions. Dependency audits and the changed-code Fallow gate are separate jobs so
one failure cannot hide another signal. See [SECURITY.md](SECURITY.md) for trust
boundaries, secret handling, deployment controls, and known gaps.

Read [the documentation index](docs/README.md) for product scope, current build
status, and engineering rules. Coding agents should start with [AGENTS.md](AGENTS.md).
