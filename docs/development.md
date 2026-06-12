# Development

This document covers the Phase 0 local development path for guga-flow. It follows the canvas-first and mock-first constraints from `docs/infinite-canvas-video-long-task-development-flow.md`.

## Runtime

Target runtime:

- Node.js 26.3.0
- pnpm 10.33.2 or newer
- Docker-compatible local infrastructure

The repository includes `.nvmrc` and `.node-version` set to Node 26.3.0. If your shell is running an older Node version, install or switch to Node 26 before treating local verification as authoritative.

## Install

```bash
pnpm install
```

The workspace uses `apps/*` and `packages/*`.

## Environment Files

Copy the examples before starting local services:

```bash
cp apps/frontend/.env.example apps/frontend/.env
cp apps/backend/.env.example apps/backend/.env
cp apps/worker/.env.example apps/worker/.env
```

Mock providers are enabled by default:

```text
LLM_PROVIDER=mock
IMAGE_PROVIDER=mock-image
VIDEO_PROVIDER=mock-video
```

Real provider keys are intentionally not required in Phase 0 and must stay server-side in backend or worker configuration.

## Local Infrastructure

Start Postgres, Redis, and the optional Nginx development gateway:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Ports:

- `3000`: Nginx gateway
- `3001`: frontend
- `3002`: backend
- `5432`: PostgreSQL
- `6379`: Redis

Direct app ports are the primary Phase 0 development path. The Nginx gateway mirrors the target local architecture and becomes more useful as cross-app routes grow.

## Database

Generate the Prisma client:

```bash
pnpm run db:generate
```

Apply the initial migration to local Postgres:

```bash
pnpm run db:migrate
```

The initial schema preserves the hybrid persistence foundation:

- `CanvasDocument.snapshotJson`
- normalized `CanvasNode`
- normalized `CanvasEdge`
- `Asset`
- `GenerationJob`
- `EditorExport`

Phase 0 does not implement Project CRUD or canvas save/load behavior.

## Development Servers

```bash
pnpm run dev
```

This builds shared packages first and then starts all app surfaces in parallel.

## Mock Workflow Verification

Run the worker-owned mock media workflow:

```bash
pnpm run mock:workflow
```

The command exercises mock LLM, image, video, and editor package providers through server-side provider contracts. It does not require real provider keys and does not create persistent jobs yet.

## Quality Gates

```bash
pnpm run format:check
pnpm run test
pnpm run build
```

Notes:

- `pnpm run test` builds shared packages and generates the Prisma client before running workspace tests.
- `pnpm run build` generates the Prisma client before building workspaces.
- If you see an engine warning, confirm you are running Node 26.3.0 or newer.

## Phase 0 Boundaries

Included:

- monorepo scaffold
- frontend workbench shell
- backend health/config/Prisma foundation
- worker mock workflow
- shared types and provider contracts
- local infra and quality gates

Deferred:

- Project CRUD
- asset upload
- tldraw canvas persistence
- custom business shapes
- persistent generation queue
- real provider adapters
- editor package zip export
