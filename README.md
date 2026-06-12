# guga-flow

guga-flow is a canvas-first novel-to-video production platform. The MVP keeps novels, storyboard scenes, characters, locations, generated images, generated videos, and editor packages as traceable production nodes on an infinite canvas.

## Current Status

This repository has completed Phase 1 of `docs/infinite-canvas-video-long-task-development-flow.md`: project management and asset library. The current app provides:

- pnpm TypeScript monorepo with `apps/*` and `packages/*`
- Next.js project dashboard and project canvas workspace route
- NestJS backend with Prisma-backed project APIs
- Local asset upload, listing, preview, and deletion APIs
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
