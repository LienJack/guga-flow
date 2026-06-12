# Development

This document covers the current local development path for guga-flow. It follows the canvas-first and mock-first constraints from `docs/infinite-canvas-video-long-task-development-flow.md`.

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

Real provider keys are intentionally not required in the current mock-first path and must stay server-side in backend or worker configuration.

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

Direct app ports are the primary development path. The Nginx gateway mirrors the target local architecture and becomes more useful as cross-app routes grow.

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

Project, asset, canvas snapshot, and business `CanvasNode` APIs are available. The visual canvas source of truth is `CanvasDocument.snapshotJson`; normalized `CanvasNode` records own business facts and geometry for custom business shapes, while `CanvasEdge` remains ready for later semantic binding phases.

## Development Servers

```bash
pnpm run dev
```

This builds shared packages first and then starts all app surfaces in parallel.

Open the frontend at `http://localhost:3001`. The home page is the project dashboard. Creating or opening a project routes to `/projects/:projectId/canvas`, which hosts the workbench shell, persistent tldraw canvas, business-node toolbar, save-status badge, fit-to-content control, selection-aware Inspector, and asset library.

## Project And Asset Workflow

Phase 1 supports:

- project list/create/open/update/delete/duplicate
- uploaded image, video, txt, and markdown assets
- project-scoped asset list/detail/preview/delete
- local storage through backend-owned upload paths

Supported upload MIME types:

- `image/png`
- `image/jpeg`
- `image/webp`
- `video/mp4`
- `video/webm`
- `text/plain`
- `text/markdown`

Uploaded files are stored under `UPLOAD_STORAGE_DIR` and exposed through backend preview routes. Provider API keys are not used by the browser.

## Project Canvas Workflow

Phase 2 and Phase 3 support a project-scoped tldraw canvas on `/projects/:projectId/canvas`.

Backend API:

- `GET /api/v1/projects/:projectId/canvas` creates or resolves the project's canvas document and returns the saved visual snapshot, normalized nodes, normalized edges, and project asset metadata.
- `PATCH /api/v1/projects/:projectId/canvas/snapshot` saves the latest visual snapshot to `CanvasDocument.snapshotJson`.
- `POST /api/v1/projects/:projectId/canvas/nodes` creates a normalized Phase 3 business node for a tldraw business shape.
- `PATCH /api/v1/projects/:projectId/canvas/nodes/:nodeId` updates business node title, status, and `dataJson`.
- `PATCH /api/v1/projects/:projectId/canvas/nodes/:nodeId/geometry` updates normalized position and size after supported canvas moves or resizes.
- `DELETE /api/v1/projects/:projectId/canvas/nodes/:nodeId` deletes the normalized business node. Related future edges can cascade through the schema; unrelated assets are preserved.

Frontend behavior:

- The canvas loads the saved tldraw snapshot before user edits are listened to.
- Business shapes are reconciled from normalized `CanvasNode` records after snapshot load, so card summaries follow the business record.
- The business toolbar creates Novel, Scene Frame, Scene, Shot, Character, Location, Image, Video, and Editor Package cards.
- tldraw shape types use a `business_*` prefix, while shape props retain the PRD business `nodeType`.
- User-originated canvas changes are autosaved with debounce.
- Business-shape move and resize events debounce a normalized geometry patch.
- Removing a business shape deletes the matching normalized `CanvasNode` without deleting project assets.
- Selecting a business node opens a type-aware Inspector form. Shot, Character, and Location forms include the richer consistency and production fields needed by later phases.
- The topbar save badge shows `Ready`, `Saving`, `Saved`, or `Failed`.
- Failed saves keep the latest local edit visible and expose a retry action.
- The `Fit to content` control calls tldraw's zoom-to-fit path for saved or newly created content.

Phase 2 browser smoke checklist:

- Start Postgres and Redis, then run backend and frontend dev servers.
- Create or open a project and navigate to `/projects/:projectId/canvas`.
- Draw a built-in tldraw shape, wait for `Saved`, refresh, and confirm the shape restores.
- Move the shape, wait for `Saved`, refresh, and confirm the updated position restores.
- Confirm the asset library still lists and previews uploaded image/video/text/markdown assets from the inspector.
- Check browser console errors and backend API responses before marking the module verified.

Phase 3 browser smoke checklist:

- Create one project and manually create every MVP business node type from the canvas toolbar.
- Confirm `GET /api/v1/projects/:projectId/canvas` returns nine normalized nodes with these types: `novel`, `scene_frame`, `scene`, `shot`, `character_asset`, `location_asset`, `image`, `video`, and `editor_package`.
- In a project with a selected Shot node, edit Visual Description, Action, and Camera Movement in the Inspector, save, and confirm the visible card summary updates.
- Refresh the page and confirm the Shot card and Inspector data restore from normalized `CanvasNode.dataJson`.
- Move the Shot card and confirm `CanvasNode.x/y/width/height` update after debounce.
- Upload or retain a project asset, delete the Shot card, refresh or re-query the API, and confirm the node is gone while the asset remains.
- Check browser console errors.

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

## Current Boundaries

Included:

- monorepo scaffold
- frontend project dashboard and workbench shell
- backend health/config/Prisma/project/asset foundation
- local asset upload and preview
- persistent project-scoped tldraw canvas snapshot load/save
- debounced canvas autosave with visible save, failed, and retry states
- business custom shapes for all Phase 3 MVP node types
- normalized business node create/update/geometry/delete APIs
- selection-aware Inspector with type-specific business forms
- worker mock workflow
- shared types and provider contracts
- local infra and quality gates

Deferred:

- semantic asset binding
- persistent generation queue
- real provider adapters
- editor package zip export
