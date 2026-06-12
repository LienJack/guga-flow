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
- `NovelDocument`
- `StoryboardDraft`
- `Asset`
- `GenerationJob`
- `EditorExport`

Project, asset, canvas snapshot, business `CanvasNode`, and semantic `CanvasEdge` APIs are available. The visual canvas source of truth is `CanvasDocument.snapshotJson`; normalized `CanvasNode` records own business facts and geometry for custom business shapes, while normalized `CanvasEdge` records own durable Character/Location relationships.

## Development Servers

```bash
pnpm run dev
```

This builds shared packages first and then starts all app surfaces in parallel.

Open the frontend at `http://localhost:3001`. The home page is the project dashboard. Creating or opening a project routes to `/projects/:projectId/canvas`, which hosts the workbench shell, persistent tldraw canvas, business-node toolbar, save-status badge, fit-to-content control, selection-aware Inspector, asset library, and Phase 5 Novel/Storyboard panel.

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
- `POST /api/v1/projects/:projectId/canvas/edges` creates a normalized semantic edge and synchronizes target node reference data in one transaction.
- `DELETE /api/v1/projects/:projectId/canvas/edges/:edgeId` deletes a semantic edge and removes the reference data owned by that edge or batch.

Frontend behavior:

- The canvas loads the saved tldraw snapshot before user edits are listened to.
- Business shapes are reconciled from normalized `CanvasNode` records after snapshot load, so card summaries follow the business record.
- The business toolbar creates Novel, Scene Frame, Scene, Shot, Character, Location, Image, Video, and Editor Package cards.
- tldraw shape types use a `business_*` prefix, while shape props retain the PRD business `nodeType`.
- User-originated canvas changes are autosaved with debounce.
- Business-shape move and resize events debounce a normalized geometry patch.
- Removing a business shape deletes the matching normalized `CanvasNode` without deleting project assets.
- Character-to-Shot and Location-to-Shot semantic bindings create normalized `CanvasEdge` records and tldraw arrow projections.
- Location-to-SceneFrame semantic binding applies the Location to eligible Shot nodes whose center point is inside the SceneFrame business card bounds.
- Semantic edge arrows are projections of normalized `CanvasEdge` rows. Built-in tldraw arrow shapes keep numeric start/end points, while separate arrow binding records attach terminals to source and target business shapes.
- Selecting a semantic connector opens an edge-focused Inspector with relation, source, target, applied-shot count where relevant, and delete action.
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

Phase 4 semantic edge workflow:

- Create Character, Location, Shot, and SceneFrame business nodes from the canvas toolbar.
- Bind Character to Shot or Location to Shot by selecting a Character/Location source and using the compact bind control, or by moving the source onto a valid target.
- Bind Location to SceneFrame to batch-apply the Location to eligible Shots contained by the SceneFrame bounds.
- Inspect the selected semantic connector from the Inspector and delete it when needed.
- Refresh the project and confirm normalized edges, visible connectors, and Shot reference summaries restore.

Phase 4 browser smoke checklist:

- Create or open a project and navigate to `/projects/:projectId/canvas`.
- Create Character, Location, Shot, and SceneFrame nodes from the toolbar.
- Create a Character-to-Shot semantic edge and confirm the Shot summary reports a character reference once.
- Create a Location-to-Shot or Location-to-SceneFrame semantic edge and confirm the Shot summary reports a Location reference.
- Refresh and confirm semantic connectors render without tldraw validation errors.
- Delete a semantic edge from the Inspector or edge API and confirm the returned Shot data no longer carries that edge-owned reference.
- Confirm the Asset Library remains visible while edge selection and deletion are available.
- Check browser console errors. Locale warning-only messages from tldraw are acceptable if no application error is logged.

## Novel And Storyboard Workflow

Phase 5 supports project-scoped novel sources and reloadable storyboard drafts without importing them into the canvas yet.

Backend NovelDocument API:

- `GET /api/v1/projects/:projectId/novels` lists project novels.
- `POST /api/v1/projects/:projectId/novels` creates a pasted novel source.
- `POST /api/v1/projects/:projectId/novels/import` creates a text or markdown source from browser-read file text.
- `GET /api/v1/projects/:projectId/novels/:novelId` reads one novel.
- `PATCH /api/v1/projects/:projectId/novels/:novelId` updates title/content and recomputes word count when content changes.
- `DELETE /api/v1/projects/:projectId/novels/:novelId` deletes the selected novel and cascades its storyboard drafts only.

Backend StoryboardDraft API:

- `POST /api/v1/projects/:projectId/novels/:novelId/generate-storyboard` calls the mock LLM provider and persists a valid storyboard draft.
- `GET /api/v1/projects/:projectId/novels/:novelId/storyboard-draft` returns the latest draft for a novel.
- `PATCH /api/v1/projects/:projectId/novels/:novelId/storyboard-draft/:draftId` saves edited storyboard JSON after shared validation passes.
- `POST /api/v1/projects/:projectId/novels/:novelId/storyboard-draft/:draftId/ready` marks a valid draft ready for Phase 6 import.

Frontend behavior:

- The workbench sidebar can create pasted novel sources and import `.txt`, `.md`, or `.markdown` files by reading text in the browser and sending it to the backend.
- The selected novel can be edited without changing canvas nodes, semantic edges, or assets.
- The mock generation action creates a `StoryboardDraft` only after the shared Zod `StoryboardResult` validation passes.
- The editor exposes overview, character, location, scene, shot, temp-reference, duration, image prompt, video prompt, and negative prompt fields.
- Draft save and ready actions use the backend validation boundary. Invalid edited drafts stay visible in the browser but cannot be saved or marked ready.
- A ready storyboard draft is an input artifact for Phase 6. Phase 5 does not create tldraw shapes, normalized `CanvasNode` rows, or normalized `CanvasEdge` rows from the draft.

Phase 5 browser/API smoke checklist:

- Apply pending migrations to local Postgres before using the real backend API.
- Create a project and a pasted novel source.
- Generate a mock storyboard draft and confirm validation succeeds.
- Edit a shot duration and prompt, save the draft, reload it, and confirm the edited values persist.
- Mark the draft ready and confirm `status=ready` and `readyForImport=true`.
- Query the project canvas and confirm `nodes.length === 0` and `edges.length === 0` until Phase 6 import exists.
- Open `/projects/:projectId/canvas` and confirm the Novel/Storyboard panel, canvas, and Inspector/Asset Library surfaces still render.
- Check browser console errors. The tldraw zh-cn missing-message warning is acceptable if no application error is logged.

## Storyboard Import And Layout Workflow

Phase 6 imports a ready storyboard draft into the canvas as normalized business graph state.

Backend Canvas import API:

- `POST /api/v1/projects/:projectId/canvas/import-storyboard` consumes a project-scoped ready `StoryboardDraft`, revalidates the stored JSON, creates or reuses canvas nodes, creates semantic edges, and returns imported graph records plus an import summary.

Import behavior:

- The mock LLM storyboard now generates 2 scenes, 6 shots, 2 characters, and 1 location so the mock-first flow can satisfy the PRD import acceptance.
- Import creates Novel, SceneFrame, Scene, Shot, Character, and Location business nodes with deterministic non-overlapping layout.
- Import creates `references_character`, `references_location`, and `belongs_to_scene` semantic edges.
- Character and Location nodes are deduplicated inside the import plan and can reuse existing project Character/Location nodes when name and role/type semantics match.
- Shot node data preserves image prompt, video prompt, duration, visual/action/camera fields, temp references, and synced `characterAssetIds` / `locationAssetId`.
- Imported nodes and edges carry `storyboardImport` provenance in `dataJson` so repeated import batches can be distinguished without a separate import-batch table.
- Repeated import defaults to a new version. The frontend shows a new-version confirmation when prior storyboard import provenance exists; overwrite/update-in-place is intentionally deferred.

Frontend behavior:

- The Novel/Storyboard panel exposes Import when the selected draft is valid, ready, and not dirty.
- Successful import merges returned CanvasNode/CanvasEdge records into the workspace state, reconciles tldraw business shapes and semantic arrows, and fits the canvas to content.
- Import errors surface in the panel without clearing unsaved storyboard edits.
- Backend JSON/urlencoded body parsing allows larger tldraw snapshots so imported storyboard boards can autosave after graph reconciliation.

Phase 6 browser/API smoke checklist:

- Apply pending migrations to local Postgres before using the real backend API.
- Create a project and pasted novel source.
- Generate the mock storyboard and confirm it contains 2 scenes and 6 shots.
- Mark the draft ready, then import it into the canvas.
- Confirm the import summary reports 2 scenes, 6 shots, 2 characters, 1 location, 14 created nodes, and semantic edges.
- Query the project canvas and confirm imported nodes, node positions, `storyboardImport` provenance, Shot prompts, Shot character/location references, and semantic edges persist.
- Import the same ready draft again and confirm the summary reports a later version while earlier imported nodes remain.
- Open `/projects/:projectId/canvas`, use the panel Import action, and confirm the imported board becomes visible and the viewport fits content.
- Confirm the post-import canvas snapshot autosave returns 200 and the topbar returns to `Saved`.
- Check browser console errors. The tldraw zh-cn missing-message warning is acceptable if no application error is logged.

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
- semantic Character/Location edge create/delete APIs
- semantic edge arrow projection, selection, Inspector, deletion, and reload reconciliation
- Character-to-Shot, Location-to-Shot, and Location-to-SceneFrame reference synchronization
- project-scoped novel source create/list/read/update/delete and text/markdown import
- shared Zod validation for `StoryboardResult`
- mock LLM storyboard draft generation, edit, reload, and ready-for-import state
- mock LLM 2-scene/6-shot storyboard output for import acceptance
- workbench Novel/Storyboard panel and compact storyboard editor
- storyboard draft import into normalized CanvasNode and CanvasEdge graph state
- deterministic storyboard import layout, new-version duplicate policy, import provenance, and canvas fit after import
- selection-aware Inspector with type-specific business forms
- worker mock workflow
- shared types and provider contracts
- local infra and quality gates

Deferred:

- persistent generation queue
- real provider adapters
- editor package zip export
