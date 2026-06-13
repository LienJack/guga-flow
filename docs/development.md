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

## Prompt Composer And Reference Asset Workflow

Phase 7 prepares imported storyboard graph state for later mock generation by composing prompts from normalized CanvasNode and CanvasEdge records.

Backend prompt API:

- `POST /api/v1/projects/:projectId/prompts/shot/:shotNodeId/compose` returns a read-only composed prompt preview for a project-scoped Shot node.
- The compose response includes separate image and video prompt outputs, a negative prompt, structured debug parts, missing-context entries, source node ids, and validated image reference asset ids.
- The backend resolves the current project canvas graph and project assets before calling the shared prompt composer. Missing Shot nodes return 404; non-Shot nodes return 400.
- The route does not create `GenerationJob` rows, call providers, update Shot prompt fields, or create Image/Video nodes.

Composition behavior:

- Shot fields contribute visual, action, camera, duration, image prompt, video prompt, and negative prompt text.
- Linked Scene, Character, and Location context is resolved from normalized semantic edges and current node `dataJson`.
- Character nodes expose editable `identityPrompt` and existing consistency/appearance fields.
- Location nodes expose editable `locationPrompt` and existing consistency/environment fields.
- Character and Location `referenceAssetIds` are node-scoped image reference bindings. Duplicate ids are deduplicated; non-image or missing assets are reported as missing context rather than passed to future generation input.
- The shared composer is pure and deterministic so Phase 8 job creation can reuse the same prompt/debug shape server-side.

Frontend behavior:

- Selecting a Character or Location shows prompt fields in the Inspector form.
- The node-level Reference images panel uploads new image references with the appropriate purpose and binds or removes project image asset ids from the selected node without deleting assets.
- Selecting a Shot shows a Prompt preview panel with image/video prompt sections, negative prompt, missing-context status, reference image count, and debug parts.
- Prompt preview refreshes when the selected Shot changes or when graph nodes/edges change, including Character/Location edits and reference-image binding.
- The global Asset Library remains the place to list, preview, and delete project assets.

Phase 7 browser/API smoke checklist:

- Apply pending migrations to local Postgres before using the real backend API.
- Create a project, novel source, mock storyboard draft, mark the draft ready, and import it into the canvas.
- Select an imported Shot and confirm the Prompt preview panel shows distinct Image prompt and Video prompt sections with Character, Location, Scene, and Shot debug parts.
- Edit a linked Character `identityPrompt` and linked Location `locationPrompt`, save each node, reselect or refresh the Shot, and confirm the prompt preview reflects the edited text.
- Upload or bind a Character/Location image reference in the node Reference images panel, refresh, and confirm the bound asset id appears in the compose API `referenceAssetIds`.
- Call `POST /api/v1/projects/:projectId/prompts/shot/:shotNodeId/compose` directly and confirm it returns image/video prompt output, debug parts, source node ids, and reference asset ids.
- Confirm non-Shot compose requests return 400 and cross-project Shot ids return 404.
- Confirm canvas autosave still reaches `Saved`, Asset Library preview/delete remains usable, and semantic edge Inspector still opens and deletes edges.
- Check browser console errors. The tldraw zh-cn missing-message warning is acceptable if no application error is logged.

## Generation Worker And Mock Media Workflow

Phase 8 turns composed Shot prompts and generated ImageNodes into durable mock media jobs. The browser creates jobs, the backend owns job input and side effects, and the worker executes provider calls outside the frontend.

Backend generation API:

- `POST /api/v1/projects/:projectId/generation/jobs` creates `shot_to_image` and `image_to_video` jobs.
- `GET /api/v1/projects/:projectId/generation/jobs` lists project jobs and returns queued/running/failed/succeeded summary counts.
- `GET /api/v1/projects/:projectId/generation/jobs/:jobId` reads one project-scoped job.
- `POST /api/v1/projects/:projectId/generation/jobs/:jobId/retry` creates a new queued job from a failed job and leaves the original failed job intact.

Worker API:

- `POST /api/v1/worker/generation/jobs/claim` claims one queued job, marks it running, and returns typed job input.
- `POST /api/v1/worker/generation/jobs/:jobId/fail` marks a running job failed and stores a readable provider or executor error.
- `POST /api/v1/worker/generation/jobs/:jobId/succeed` completes a running job and applies generated media side effects.

Generation behavior:

- `shot_to_image` reuses the backend Shot prompt composer so the stored job input contains the final image prompt, negative prompt, reference asset ids, source node ids, and debug parts that the Inspector preview shows.
- `image_to_video` starts from an ImageNode asset and derives video prompt, duration, references, and parent Shot context when a generated image edge points back to a Shot.
- The worker can run as a polling loop or as a deterministic one-shot command:

```bash
BACKEND_INTERNAL_URL=http://localhost:3002/api/v1 pnpm --filter @guga-flow/worker run worker:once
```

- Mock provider success creates placeholder bytes in backend storage, an `Asset`, an `ImageNode` or `VideoNode`, a `generated_image` or `generated_video` semantic edge, a typed job output, and succeeded node/job statuses.
- Mock provider failure is durable and visible in the job list. Retry is append-only, so failed attempts stay auditable.
- Mock provider storage keys are bounded even for long composed prompts, preventing local filesystem filename failures.

Frontend behavior:

- Selecting a Shot shows a Generate Image action in the Inspector.
- Selecting an ImageNode with an image `assetId` shows a Generate Video action in the Inspector.
- The workbench footer polls queue counts and shows queued, running, and failed jobs.
- When polling observes terminal job changes, the canvas facts refresh so generated assets, nodes, and edges appear without a full browser reload.

Phase 8 browser/API smoke checklist:

- Apply pending migrations to local Postgres before using the real backend API.
- Create or open a project with imported storyboard graph state.
- Create a `shot_to_image` job from a Shot, run `worker:once`, and confirm the job succeeds with a generated image Asset, ImageNode, and `generated_image` edge.
- Create an `image_to_video` job from the generated ImageNode, run `worker:once`, and confirm the job succeeds with a generated video Asset, VideoNode, and `generated_video` edge.
- Create a forced-failure job, run `worker:once`, and confirm the failed job remains while retry creates a separate queued job.
- Open `/projects/:projectId/canvas`, select the Shot and ImageNode, and confirm Inspector actions, queue counts, generated assets, and generated nodes render.
- Check browser console errors. The tldraw zh-cn missing-message warning is acceptable if no application error is logged.

## Real Image Provider Workflow

Phase 9 extends `shot_to_image` with safe image provider selection, real image adapter seams, server-side media persistence, and multi-output ImageNode completion.

Provider catalog API:

- `GET /api/v1/providers/image` returns safe metadata for `mock-image`, `image2`, and `banana`.
- The catalog includes enabled state, disabled reason, model options, supported aspect ratios, output count limits, and provider parameter metadata.
- The catalog never includes API key values. Browser-visible provider settings never request or store secrets.
- Health output includes selected image provider and per-provider key presence booleans without exposing key values.

Server-side image provider keys:

```text
OPENAI_API_KEY=
IMAGE2_API_KEY=
GEMINI_API_KEY=
GOOGLE_API_KEY=
BANANA_API_KEY=
```

`image2` uses `OPENAI_API_KEY` or `IMAGE2_API_KEY`. `banana` uses `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or `BANANA_API_KEY`. The mock provider remains enabled with no keys. When real keys are absent, `image2` and `banana` are disabled in the catalog and rejected before job creation.

Generation behavior:

- Selecting a Shot shows provider, model, aspect ratio, output count, and provider parameter controls in the Inspector generation panel.
- Default settings use `mock-image` and remain compatible with the Phase 8 mock path.
- `shot_to_image` job input preserves provider, model, aspect ratio, count, provider params, prompt debug parts, and reference metadata.
- Reference asset ids are capped to the selected provider's limit; omitted ids are recorded in job input with a visible omission reason.
- Worker adapter dispatch selects `mock-image`, `image2`, or `banana` from the shared provider registry.
- `image2` and `banana` adapters normalize inline base64 image bytes, remote image URLs, and provider HTTP failures into typed outputs or readable `ProviderFailure` values.
- Backend completion downloads remote URLs server-side or decodes inline base64 before creating project `Asset` rows.
- Multi-output image completion creates one Asset, one ImageNode, and one `generated_image` edge per provider output. The job output keeps first-target compatibility fields plus a complete `targets` trace.
- Retry remains append-only and preserves the original provider settings.

Phase 9 no-key smoke checklist:

- Run `GET /api/v1/providers/image` with no real keys and confirm `mock-image.enabled === true`, `image2.enabled === false`, and `banana.enabled === false`.
- Confirm the provider catalog and `/api/v1/health` response do not contain raw key values.
- Open `/projects/:projectId/canvas`, select a Shot, and confirm disabled real providers render with non-secret disabled reasons while `mock-image` remains selectable.
- Create a default Shot image job and run `worker:once`; confirm the mock output still creates a generated image Asset, ImageNode, and `generated_image` edge.

Phase 9 mocked-real-provider smoke checklist:

- Use tests or a local stubbed provider response to complete an `image2` job with multiple outputs.
- Include one inline base64 output and one HTTPS remote URL output, and confirm preview bytes are served from local asset storage rather than the provider URL.
- Confirm the completed job output contains `targets` for each generated ImageNode and edge.
- Force or mock a provider failure and confirm the failed job stores a readable error while retry creates a new queued job with the same provider settings.

Optional live smoke:

- Set server-side OpenAI/Gemini image keys in backend and worker env files only.
- Restart backend and worker so `GET /api/v1/providers/image` reports the chosen real provider enabled.
- Generate a low-count Shot image job from the Inspector, run the worker once, and confirm the resulting Asset preview is served by the backend.
- Remove keys after the smoke if the environment is shared. Never put provider keys in frontend env files or browser storage.

## Real Video Provider Workflow

Phase 10 extends `image_to_video` with a safe video provider catalog, async provider task submission/polling, cancel routing, remote video persistence, and batch Image -> Video child jobs.

Provider catalog API:

- `GET /api/v1/providers/video` returns safe metadata for `mock-video`, `seedance`, and `happyhorse`.
- Real video providers are disabled when their server-side keys are missing and are rejected before job creation.
- The browser receives model, duration, resolution, aspect ratio, cancel support, and provider parameter metadata, never raw key values.
- `/api/v1/health` reports video provider key presence as booleans for `seedance` and `happyhorse`.

Server-side video provider keys:

```text
SEEDANCE_API_KEY=
BYTEPLUS_API_KEY=
ARK_API_KEY=
MODELARK_API_KEY=
HAPPYHORSE_API_KEY=
FAL_KEY=
FAL_API_KEY=
RUNWARE_API_KEY=
VIDEO_API_KEY=
```

`seedance` uses `SEEDANCE_API_KEY`, `BYTEPLUS_API_KEY`, `ARK_API_KEY`, or `MODELARK_API_KEY`. `happyhorse` uses `HAPPYHORSE_API_KEY`, `FAL_KEY`, `FAL_API_KEY`, or `RUNWARE_API_KEY`. Keep these keys in backend and worker env files only. Do not put provider keys in frontend env files or browser storage.

Async job behavior:

- Selecting an ImageNode with an asset shows provider, model, aspect ratio, duration, resolution, and provider parameter controls in the Inspector.
- Creating an `image_to_video` job persists provider settings in `GenerationJob.inputJson`.
- The worker calls `createTask` once for a new video job. Waiting providers return `providerTaskId`; the backend records it through the worker `wait` endpoint and moves the job to `provider_waiting`.
- A later worker claim of a `provider_waiting` job polls `getTask` by `providerTaskId` instead of submitting another provider task.
- Provider success posts one video provider output to backend completion. Remote HTTPS video URLs are downloaded server-side into project storage before the VideoNode and `generated_video` edge are created.
- Active jobs can be cancelled from the Inspector. The backend records `cancelled` and makes one best-effort `cancelTask` call when a provider task id is present.
- Multi-selecting ImageNodes enables batch Image -> Video. The backend creates one child `image_to_video` job per valid selected image and reports skipped nodes without creating browser-side provider work.

Phase 10 no-key smoke checklist:

- Run `GET /api/v1/providers/video` with no real keys and confirm `mock-video.enabled === true`, `seedance.enabled === false`, and `happyhorse.enabled === false`.
- Confirm `/api/v1/providers/video` and `/api/v1/health` do not contain raw key values.
- Open `/projects/:projectId/canvas`, select an ImageNode, and confirm the video generation panel shows `mock-video` enabled and real video providers disabled with non-secret reasons.
- Confirm the queue footer shows queued, running, waiting, failed, and cancelled counts without horizontal overflow on mobile.

Phase 10 mocked-real-provider smoke checklist:

- Stub a video provider `createTask` response, confirm the worker moves the job to `provider_waiting` with one `providerTaskId`.
- Poll a completed task with an HTTPS `.mp4`/`.webm` URL and confirm the backend creates a project video Asset, VideoNode, and `generated_video` edge.
- Cancel a waiting job and confirm the UI stops treating it as active.
- Batch two ImageNodes and confirm child jobs are queued independently while invalid selections are reported as skipped.

Optional live smoke:

- Set one server-side video provider key in backend and worker env files only.
- Restart backend and worker so `GET /api/v1/providers/video` reports the chosen provider enabled.
- Generate a short low-resolution Image -> Video job from the Inspector, run the worker loop until completion, and confirm the resulting Asset preview is served by the backend.
- Remove keys after the smoke if the environment is shared. Live video provider calls can incur cost.

## Editor Export Package Workflow

Phase 11 turns selected VideoNodes into a downloadable editor package while preserving canvas traceability.

Backend EditorExport API:

- `POST /api/v1/projects/:projectId/editor-exports` validates selected VideoNodes, creates an `EditorExport`, and queues an `editor_export` `GenerationJob`.
- `GET /api/v1/projects/:projectId/editor-exports` lists project export records.
- `GET /api/v1/projects/:projectId/editor-exports/:exportId` reads one export record.
- `GET /api/v1/projects/:projectId/editor-exports/:exportId/download` streams the succeeded ZIP package from backend-owned storage.
- `POST /api/v1/projects/:projectId/editor-exports/:exportId/send` optionally posts package metadata to server-side `LOCAL_EDITOR_URL`.

Package behavior:

- Multi-select VideoNodes with bound video `assetId` values in the canvas Inspector.
- Choose `shot_index`, `canvas_x`, or `manual` sort mode and queue export.
- Run the worker once or in polling mode. The worker claims `editor_export`, fetches clip bytes through backend asset preview routes, builds a ZIP containing `timeline.json`, `storyboard.csv`, and ordered `clips/shot_###` files, then reports package output to the backend.
- Backend completion persists the ZIP as an `editor_package` Asset, updates `EditorExport`, creates an `editor_package` canvas node, and connects each selected VideoNode to it with `sent_to_editor` edges.
- Local editor send is post-completion only. Missing or failing `LOCAL_EDITOR_URL` returns a readable handoff error while the package remains downloadable.

Optional local editor env:

```text
LOCAL_EDITOR_URL=http://localhost:4300/editor-exports
```

Keep `LOCAL_EDITOR_URL` in backend and worker env files only. The browser never posts directly to the local editor and never sees the configured URL.

Phase 11 browser/API smoke checklist:

- Create or open a project with at least two succeeded VideoNodes backed by video Assets.
- Multi-select the VideoNodes and confirm the Inspector shows Editor Export controls and sort-mode buttons.
- Queue an export, run `BACKEND_INTERNAL_URL=http://localhost:3002/api/v1 pnpm --filter @guga-flow/worker run worker:once`, and confirm the export job succeeds.
- Download the package and inspect that it contains `timeline.json`, `storyboard.csv`, and clip entries under `clips/`.
- Refresh the canvas and confirm the Editor Package node and `sent_to_editor` edges restore from backend graph facts.
- With no `LOCAL_EDITOR_URL`, use Send and confirm the UI reports the handoff failure while Download remains available.
- Optionally run a local HTTP receiver, set `LOCAL_EDITOR_URL`, restart backend, send again, and confirm the backend posts package metadata server-side.

## Canvas Productivity Workflow

Phase 12 adds large-canvas production controls without changing the normalized graph boundary.

Backend generation and graph behavior:

- `POST /api/v1/projects/:projectId/generation/jobs/batch-shots-to-images` accepts selected Shot node ids and creates one queued `shot_to_image` child job per valid Shot.
- Batch Shot image creation reuses normal Shot prompt composition and provider settings. Invalid or missing Shot ids are returned in `skipped` with readable reasons.
- Existing batch Image -> Video remains available at `batch-images-to-videos`.
- Public canvas edge creation accepts `derived_from` when source and target nodes are distinct nodes of the same type.

Workbench behavior:

- Multi-select Shot nodes in the canvas Inspector to queue batch keyframe image jobs.
- Multi-select ImageNodes with assets to queue batch video jobs as before.
- The left Navigator searches node title, type, ids, and common business/media metadata, then selects/focuses a matching node on the canvas.
- Shortcuts: `/` or `Cmd/Ctrl+K` focuses Navigator search; `F` fits the canvas. These shortcuts skip text-entry fields and contenteditable targets.
- Selecting a SceneFrame shows a collapse/expand action. Collapse persists on `CanvasNode.dataJson.collapsed` and renders the SceneFrame card compactly without deleting child nodes or edges.
- Selecting a Shot shows preferred Image/Video selectors derived from existing `generated_image` and `generated_video` edges. The selected ids persist on the Shot node.
- Duplicate Variant creates a new nearby node with copied data and a `derived_from` edge back to the source.

Phase 12 browser/API smoke checklist:

- Import or create a storyboard with several Shot nodes, multi-select them, and confirm Batch Image shows the selected count.
- Queue batch Shot images and confirm each valid Shot receives an ordinary `shot_to_image` job while invalid selections are skipped.
- Search by shot number, character/location metadata, or media asset id and confirm selecting a result updates the canvas selection and focus.
- Collapse a SceneFrame, refresh, and confirm the compact card returns while graph children remain present.
- Generate multiple Image/Video candidates for a Shot, choose preferred media in the Inspector, refresh, and confirm selected ids remain on the Shot data.
- Duplicate a Shot or media node as a variant and confirm a new node plus `derived_from` edge survives reload.

## Mock Workflow Verification

Run the worker-owned mock media workflow:

```bash
pnpm run mock:workflow
```

The command exercises mock LLM, image, video, and editor package providers through server-side provider contracts. It does not require real provider keys.

To exercise persistent Phase 8 jobs, keep the backend running and execute one claimed job at a time:

```bash
BACKEND_INTERNAL_URL=http://localhost:3002/api/v1 pnpm --filter @guga-flow/worker run worker:once
```

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
- shared graph-derived prompt composer for imported Shot, Scene, Character, Location, and reference asset context
- backend Shot prompt compose API with structured debug parts and missing-context reporting
- Character/Location prompt fields plus node-scoped reference image binding in the Inspector
- Shot prompt preview/debug panel in the Inspector
- persistent GenerationJob creation from composed prompts
- DB-backed worker claim/succeed/fail endpoints
- worker one-shot and polling loop for mock image/video generation jobs
- generated mock media asset persistence with previewable placeholder bytes
- generated ImageNode and VideoNode creation with `generated_image` and `generated_video` semantic edges
- generation job retry, failed job visibility, and queue polling in the workbench
- safe image provider catalog with disabled-state metadata for `mock-image`, `image2`, and `banana`
- fetch-based `image2` and `banana` image adapters behind provider contracts
- backend-owned inline and remote generated image persistence
- multi-output Shot image completion into multiple ImageNodes and generated edges
- compact Shot generation provider settings in the Inspector
- safe video provider catalog with disabled-state metadata for `mock-video`, `seedance`, and `happyhorse`
- fetch-based `seedance` and `happyhorse` video adapters behind provider contracts
- async video provider task lifecycle through `createTask`, `provider_waiting`, `getTask`, and backend worker wait endpoint
- video generation cancel routing with best-effort provider task cancellation
- backend-owned remote generated video persistence into project Assets
- batch ImageNode -> VideoNode generation child jobs
- compact ImageNode video generation settings and multi-select batch controls in the Inspector
- selected VideoNode editor export workflow
- downloadable editor package ZIPs with timeline, storyboard CSV, and clip entries
- backend-owned package Asset persistence and EditorPackageNode graph trace
- optional server-side local editor handoff with non-blocking failure state
- batch ShotNode -> ImageNode generation child jobs
- sidebar Navigator search and outline for large canvas navigation
- shortcut-safe search focus and fit-to-content commands
- persisted SceneFrame collapse state with compact card rendering
- Shot preferred generated Image/Video selection persisted on node data
- duplicate-as-variant action with durable `derived_from` edges
- selection-aware Inspector with type-specific business forms
- worker mock workflow
- shared types and provider contracts
- local infra and quality gates

Deferred:

- StyleAsset and PropAsset reference workflows
- timeline editing UI and manual drag-reorder for exports
- graphical minimap and PNG canvas export
