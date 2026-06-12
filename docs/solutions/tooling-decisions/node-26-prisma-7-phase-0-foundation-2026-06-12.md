---
title: "Target Node 26 Before Choosing Phase 0 Tooling"
date: 2026-06-12
category: tooling-decisions
module: phase-0-engineering-foundation
problem_type: tooling_decision
component: tooling
severity: medium
applies_when:
  - "Starting a new TypeScript monorepo foundation"
  - "Local Node is older than the intended project runtime"
  - "Current framework releases require newer runtime and package boundaries"
related_components:
  - database
  - testing_framework
  - development_workflow
tags:
  - node-26
  - prisma-7
  - typescript-6
  - pnpm
---

# Target Node 26 Before Choosing Phase 0 Tooling

## Context

Phase 0 created the first application code for guga-flow: a pnpm workspace,
Next frontend, Nest backend, worker, shared packages, Prisma schema, and local
infra. The local shell was still running Node v22.22.2, while the project
should target the newer runtime rather than lowering framework choices to match
the current machine.

The durable decision is to make the repository explicit about the runtime target
first, then select and verify current framework releases around that target.

## Guidance

Set the runtime contract in every place that affects humans and automation:

```json
{
  "packageManager": "pnpm@10.33.2",
  "engines": {
    "node": ">=26.3.0",
    "pnpm": ">=10.0.0"
  }
}
```

Mirror the same Node version in `.nvmrc`, `.node-version`, CI
`actions/setup-node`, README, and development docs. Local checks may still run
under an older Node while bootstrapping, but engine warnings should be treated
as a reminder to upgrade the shell, not as evidence that the repository should
downgrade.

For the Phase 0 stack, the verified dependency set is:

- Next 16.2.9 and React 19.2.7 for the frontend shell.
- Nest 11.1.26 for the backend shell.
- Prisma 7.8.0 with `prisma-client`, `@prisma/adapter-pg`, and generated client
  output outside tracked source.
- TypeScript 6.0.3 and Vitest 4.1.8 across apps and packages.
- pnpm 10.33.2 as the workspace package manager.

Prisma 7 also changes the shape of the foundation:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  runtime      = "nodejs"
  moduleFormat = "cjs"
}
```

Use `prisma.config.ts` for schema, migration path, and datasource URL. Use the
Postgres driver adapter in the Nest-owned Prisma service. Ignore generated
client files in Git and keep generated JavaScript/declaration output under
package `dist/` directories.

When Nest and worker apps consume workspace packages, keep the internal package
format consistent with the current app runtime. In this Phase 0 scaffold,
shared packages compile to CommonJS because the backend and worker are CommonJS
apps and the generated Prisma client is also CommonJS.

## Why This Matters

Downgrading the framework stack to satisfy the developer machine would make the
first repository baseline stale on day one. Upgrading the runtime instead keeps
the code aligned with current package behavior and prevents follow-up modules
from inheriting obsolete assumptions.

This also makes engine drift visible. The project can still be inspected on an
older local Node, but every root command reports the mismatch until the shell is
upgraded. CI uses the target Node version, so the authoritative path remains the
future-facing runtime.

The Prisma-specific choices matter because Prisma 7 no longer behaves like the
older generator defaults. Without the explicit generator output, adapter, and
ignore rules, generated files can leak into the app tree or the backend can pass
tests while later runtime connections fail.

## When to Apply

- Starting a greenfield workspace from documentation or architecture references.
- Updating framework majors when the local shell is behind the intended runtime.
- Adding Prisma 7 to a Nest or worker-owned backend boundary.
- Creating shared packages consumed by both ESM and CommonJS app surfaces.

## Examples

Prefer this:

```text
Target Node 26.3.0 in package.json, .nvmrc, .node-version, CI, and docs.
Install current framework versions against that target.
Keep the local Node 22 warning visible until the machine is upgraded.
```

Avoid this:

```text
Lower Next, React, Nest, Prisma, or TypeScript because the current shell is
still running an older Node.
```

After changing Prisma schema foundations, verify the whole chain:

```bash
pnpm --filter @guga-flow/backend run prisma:generate
pnpm --filter @guga-flow/backend run build
pnpm --filter @guga-flow/backend run test
pnpm run format:check
pnpm run test
pnpm run build
pnpm run mock:workflow
docker compose -f infra/docker-compose.yml config
```

## Related

- `docs/development.md`
- `docs/plans/2026-06-12-001-feat-phase-0-engineering-foundation-plan.md`
- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma.config.ts`
- `.github/workflows/ci.yml`
