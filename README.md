# guga-flow

guga-flow is a canvas-first novel-to-video production platform. The MVP keeps novels, storyboard scenes, characters, locations, generated images, generated videos, and editor packages as traceable production nodes on an infinite canvas.

## Phase 0 Status

This repository is in Phase 0 of `docs/infinite-canvas-video-long-task-development-flow.md`: engineering foundation. The current scaffold provides:

- pnpm TypeScript monorepo with `apps/*` and `packages/*`
- Next.js frontend shell
- NestJS backend shell with Prisma foundation
- Worker mock workflow shell
- Shared domain types and provider contracts
- Local Postgres/Redis/Nginx infrastructure definition
- Mock-first provider verification

## Quick Start

See `docs/development.md` for local setup, environment variables, database generation, mock workflow verification, and quality gates.

## Quality Gates

```bash
pnpm run format:check
pnpm run test
pnpm run build
```

The project targets Node.js 26.3.0. Use `.nvmrc` or `.node-version` to switch before relying on local verification.
