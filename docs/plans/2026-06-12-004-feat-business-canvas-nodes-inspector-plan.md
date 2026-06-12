# Phase 3 Business Canvas Nodes and Inspector Plan

Status: Active  
Date: 2026-06-12  
Origin: docs/brainstorms/2026-06-12-004-phase-3-business-custom-shapes-inspector-requirements.md  
PRD phase: Phase 3, Business Custom Shapes and Inspector

## Goal

Implement the first business-aware canvas layer on top of the Phase 2 durable tldraw canvas. A creator must be able to create every Phase 3 MVP business node type, see it as a custom canvas card, select it, edit type-specific business fields in the Inspector, move or resize it, delete it, refresh the page, and recover both the visual shape and normalized `CanvasNode` data.

This module proves the Hybrid Snapshot + Normalized Business Data boundary for future semantic edges, storyboard import, prompt composition, generation jobs, and export.

## Traceability

- R1, R2, R3, AE1: business node creation, custom cards, normalized records.
- R4, R13, AE3: baseline select, drag, resize, duplicate, geometry restore.
- R5, R6, R7, R8, AE2, AE5: selection-aware Inspector, type-specific editing, card summary updates.
- R9, R10: restore business data from `CanvasNode`, not only the tldraw snapshot.
- R11, R12, AE4: delete visible shape and normalized node while preserving assets and relying on edge cleanup readiness.
- R14, R15, R16: type-specific fields for Shot, Character, Location, and the remaining MVP node types.
- R17: visible create, edit, geometry, and delete failures.
- R18, AE6: browser verification covers all MVP nodes and preserves the existing asset library.

## Scope

In scope:

- Shared contracts for Phase 3 node data, creation, updates, geometry sync, and delete responses.
- Project-scoped backend API for `CanvasNode` create, update, geometry update, and delete.
- Frontend API client functions and default node-data helpers.
- A reusable tldraw business shape plus registered `ShapeUtil` classes for the nine Phase 3 MVP node types.
- A compact business-node creation toolbar inside the canvas workspace.
- Selection plumbing from tldraw into a selection-aware Inspector.
- Inspector forms for title, status, and minimum type-specific fields, with richer Shot, Character, and Location fields.
- Browser smoke verification for create, edit, move or resize, reload, delete, and asset library preservation.

Out of scope:

- Semantic `CanvasEdge` creation and visual arrows.
- Asset drag/drop binding to business nodes.
- Storyboard import, auto-layout, prompt composition, generation jobs, provider integrations, media export, and large-canvas performance gates.
- Real image or video provider behavior.
- Replacing tldraw, Prisma, NestJS, Next.js, or the Node 26 target.

## Assumptions

- Phase 3 remains one Deep module, but implementation should commit completed major units as they land.
- The nine manually creatable MVP types are `novel`, `scene_frame`, `scene`, `shot`, `character_asset`, `location_asset`, `image`, `video`, and `editor_package`.
- Existing generic tldraw drawing can remain available; Phase 3 acceptance focuses on business nodes created through the new product controls.
- `style_asset`, `prop_asset`, and `note` stay in shared enum support but are not required as visible creation toolbar options in this module.
- Inspector edits can save on explicit form submission or blur as long as the saved state is visible, durable, and test-covered. Explicit submit is acceptable if it reduces accidental writes for the first implementation.
- Duplicate support may use tldraw's normal duplicate gesture, but copied business nodes must not silently point two shapes at the same `CanvasNode`. If full normalized duplicate handling proves too risky, disable or intercept duplicate for business shapes and document the deferred behavior before review.

## Local Research

- `packages/shared-types/src/domain/canvas.ts` already defines `CanvasNodeType`, `NodeStatus`, `CanvasNodeRecord`, `CanvasEdgeRecord`, `CanvasLoadResult`, and snapshot save contracts. It does not yet define typed Phase 3 `dataJson` contracts or node mutation inputs.
- `apps/backend/prisma/schema.prisma` already has `CanvasDocument`, `CanvasNode`, and `CanvasEdge`. `CanvasNode` is unique by `[canvasDocumentId, tldrawShapeId]`, indexed by project/type, and `CanvasEdge` cascades when source or target nodes are deleted.
- `apps/backend/src/canvas/canvas.service.ts` currently loads a canvas document, nodes, edges, and assets, and saves snapshots. It lacks node create/update/delete and geometry mutation paths.
- `apps/frontend/src/components/canvas/canvas-editor.tsx` currently loads a persisted snapshot, registers the Phase 2 autosave listener, and renders default `<Tldraw />`. It has no custom shape registration, node creation toolbar, selection reporting, or geometry sync.
- `apps/frontend/src/components/canvas/project-canvas-workspace.tsx` currently places `AssetLibrary` directly in the Inspector slot. Phase 3 should wrap the asset library in the new Inspector experience rather than remove it.
- `apps/frontend/src/lib/api.ts` has project, asset, canvas load, and snapshot save calls but no business node mutation calls.
- Existing tests are Vitest-based unit tests for shared contracts, backend service/e2e behavior, frontend render smoke, API utilities, and autosave behavior. Phase 3 should extend those instead of introducing a new test framework.

## External API Research

Context7 `/tldraw/tldraw` documentation confirms the current custom-shape path:

- Define shape props through `TLGlobalShapePropsMap`.
- Implement `ShapeUtil` with `static type`, `static props: RecordProps<Shape>`, `getDefaultProps`, `getGeometry`, `component`, and indicator rendering.
- Render DOM-based cards through `HTMLContainer`.
- Register custom utilities through the `<Tldraw shapeUtils={[...]} />` prop.
- Add custom UI through the `<Tldraw components={...} />` prop.
- Read selection reactively with `track()` and `useEditor()`.
- Listen to store changes with editor change/store listeners and inspect added, updated, and removed shape records.

Implementation should verify exact imports against the installed `tldraw@5.1.0` package before editing shape files.

## Design Decisions

### One Business Shape Type vs Nine Render Types

Use one reusable render component and one shared prop model, while registering one `ShapeUtil` class per MVP node type. This satisfies the PRD's "one ShapeUtil per node type" requirement without duplicating card rendering and geometry logic.

The shape props should hold only render summary data:

- `nodeId`
- `nodeType`
- `title`
- `status`
- `summary`
- `w`
- `h`

Full business facts stay in `CanvasNode.dataJson`.

### Shape ID Ownership

The frontend creates a tldraw shape id first, then POSTs the normalized `CanvasNode` with that `tldrawShapeId`, then inserts the shape with the returned node summary. This keeps `CanvasNode` and tldraw snapshot aligned from the first visible frame.

If node creation fails, the visible shape should not be inserted. If shape insertion fails after node creation, surface a visible error and allow retry/reload recovery from normalized nodes.

### Restore Strategy

On canvas load:

1. Load the persisted tldraw snapshot when present.
2. Compare returned `CanvasNode` records with business shapes found in the loaded editor.
3. For missing business shapes, create cards from normalized records using stored geometry and summary props.
4. For existing business shapes, update summary props from normalized records so Inspector edits survive even if snapshot props are stale.

This avoids making `CanvasDocument.snapshotJson` the sole source of business truth.

### Inspector Save Strategy

Inspector submits updates to the backend first. After a successful response, the frontend updates local node state and the selected shape props. If the backend fails, the form remains dirty and shows an error; save status must not report success.

### Geometry Sync Strategy

The Phase 2 snapshot autosave still stores visual state. For business shapes, user-driven move/resize events should also debounce a normalized geometry patch to `CanvasNode`. Geometry save failures should be visible but should not block snapshot autosave retry.

### Delete Strategy

When a business shape is removed by the product delete command or normal tldraw delete, delete the normalized `CanvasNode` for the current project. The database can cascade related `CanvasEdge` rows, while `Asset` records remain untouched. If the backend delete fails, show an error and force a reload/recovery path rather than claiming the node is gone.

## Implementation Units

### U1. Shared Phase 3 Canvas Contracts

Requirements: R1, R2, R6, R7, R14, R15, R16, R17  
Files:

- `packages/shared-types/src/domain/canvas.ts`
- `packages/shared-types/src/domain/domain.test.ts`

Work:

- Add a `PHASE_3_CANVAS_NODE_TYPES` constant for the nine manually creatable types.
- Add typed `dataJson` interfaces for Novel, SceneFrame, Scene, Shot, CharacterAsset, LocationAsset, Image, Video, and EditorPackage nodes.
- Add a discriminated data mapping type for `CanvasNodeRecord`.
- Add mutation contracts:
  - create node input/result
  - update node business fields input/result
  - update node geometry input/result
  - delete node result
- Add summary helpers or summary contract types used by frontend cards.
- Keep the broader enum values for later phases; do not remove `style_asset`, `prop_asset`, or `note`.

Tests:

- Verify every Phase 3 creatable type is included in `CANVAS_NODE_TYPES`.
- Verify default/minimum Shot, Character, and Location data shapes are serializable and map to valid records.
- Verify mutation input shapes allow JSON-compatible business data but reject no type at compile/runtime helper boundaries where practical.

Exit:

- Shared package tests pass.
- Backend and frontend can import a single source of truth for Phase 3 types and mutation inputs.

### U2. Backend CanvasNode CRUD API

Requirements: R1, R2, R7, R9, R11, R12, R13, R17  
Files:

- `apps/backend/src/canvas/dto.ts`
- `apps/backend/src/canvas/canvas.service.ts`
- `apps/backend/src/canvas/canvas.controller.ts`
- `apps/backend/src/canvas/canvas.service.spec.ts`
- `apps/backend/test/app.e2e-spec.ts`

Work:

- Add routes under `projects/:projectId/canvas/nodes`:
  - `POST /nodes`
  - `PATCH /nodes/:nodeId`
  - `PATCH /nodes/:nodeId/geometry`
  - `DELETE /nodes/:nodeId`
- Reuse the existing project-scoped `CanvasDocument` upsert path for create.
- Validate node type, status, geometry numbers, tldraw shape id, title, and JSON-compatible `dataJson`.
- Keep all mutations scoped by `projectId` and `canvasDocumentId`.
- On delete, remove the `CanvasNode`; rely on schema cascade for related `CanvasEdge` rows and explicitly verify assets are not touched.
- Return normalized `CanvasNodeRecord` after create/update/geometry mutations.

Tests:

- Service test creates a node and returns the expected project-scoped record.
- Service test updates title, status, and Shot `dataJson`.
- Service test patches geometry and rejects non-finite coordinates or dimensions.
- Service test deletes a node through a project-scoped lookup and does not call asset deletion.
- Service/e2e test rejects missing projects and cross-project node mutation attempts.
- E2E test covers create, update, geometry, delete route wiring.

Exit:

- Backend targeted tests pass.
- API surface is stable enough for frontend integration.

### U3. Frontend API Client and Node Data Helpers

Requirements: R1, R3, R7, R8, R14, R15, R16, R17  
Files:

- `apps/frontend/src/lib/api.ts`
- `apps/frontend/src/components/canvas/business-node-data.ts`
- `apps/frontend/src/components/canvas/business-node-data.test.ts`
- Existing or new frontend API tests if present.

Work:

- Add API client calls for create, update, geometry, and delete.
- Add default-data builders for every Phase 3 MVP node type.
- Add card summary builders that translate `CanvasNodeRecord` plus typed `dataJson` into the shape props summary.
- Add field metadata for Inspector forms so the UI does not hard-code every label in multiple places.
- Keep helpers pure and testable outside tldraw.

Tests:

- Verify defaults for all nine creatable node types.
- Verify Shot visual description, action, camera movement, duration, and prompt notes appear in summaries.
- Verify Character and Location helpers expose the consistency fields needed by their forms.
- Verify summary builders tolerate partially populated `dataJson` from older records.

Exit:

- Frontend helper tests pass.
- API client compiles against shared contracts.

### U4. Business Shape Utilities and Card Rendering

Requirements: R1, R3, R4, R8, R10, R13, R17  
Files:

- `apps/frontend/src/components/canvas/business-node-shape.tsx`
- `apps/frontend/src/components/canvas/business-node-card.tsx`
- `apps/frontend/src/components/canvas/business-node-shape-utils.tsx`
- `apps/frontend/src/components/canvas/business-node-card.test.tsx`
- `apps/frontend/src/components/canvas/canvas-editor.tsx`
- `apps/frontend/src/app/layout.tsx` only if shape styles require global CSS import changes.
- `apps/frontend/src/app/globals.css`

Work:

- Define the business node tldraw shape props with `nodeId`, `nodeType`, `title`, `status`, `summary`, `w`, and `h`.
- Implement a shared card component with distinct visual treatment per node type while keeping the layout compact and readable.
- Register one `ShapeUtil` class per Phase 3 MVP type, all delegating to the shared card and geometry behavior.
- Support resizing through shape `w` and `h`.
- Ensure cards remain usable at small sizes and avoid text overflow.
- Register the shape utils in `<Tldraw />`.

Tests:

- Static render tests cover card variants for all nine node types.
- Test shape utility defaults and geometry for at least one representative node type.
- Frontend lint/typecheck catches tldraw API drift.

Exit:

- Canvas can render custom business card shapes without breaking generic tldraw rendering.

### U5. Business Node Creation, Restore, Selection, Geometry Sync, and Delete

Requirements: R1, R2, R4, R8, R9, R10, R11, R13, R17, R18  
Files:

- `apps/frontend/src/components/canvas/canvas-editor.tsx`
- `apps/frontend/src/components/canvas/business-node-toolbar.tsx`
- `apps/frontend/src/components/canvas/use-business-node-sync.ts`
- `apps/frontend/src/components/canvas/use-selected-business-nodes.ts`
- `apps/frontend/src/components/canvas/canvas-editor.test.tsx`
- `apps/frontend/src/components/canvas/business-node-sync.test.ts`
- `apps/frontend/src/app/globals.css`

Work:

- Add a compact creation toolbar with one icon/text affordance per MVP business node type.
- Create normalized nodes before inserting visible business shapes.
- Reconcile loaded `CanvasNode` records with tldraw shapes after snapshot load.
- Track current selection and expose selected business nodes to `ProjectCanvasWorkspace`.
- Debounce geometry patches for user-driven move/resize of business shapes.
- Intercept or handle business shape deletion so `CanvasNode` records are deleted with visible error handling.
- Decide and implement duplicate behavior:
  - preferred: duplicate creates a new normalized `CanvasNode` with copied data and new shape id;
  - fallback: disable/intercept duplicate for business shapes and record the deferral.

Tests:

- Creation test verifies API create is called and the editor receives a business shape with returned node id.
- Restore test verifies missing snapshot shapes are recreated from normalized nodes.
- Selection test verifies a selected business shape reports the matching node to the workspace.
- Geometry test verifies movement/resizing schedules a geometry patch with current bounds.
- Delete test verifies a business shape delete calls backend delete and clears selection.
- Failure tests verify create/delete/geometry errors are visible.

Exit:

- All MVP business nodes can be created, selected, moved/resized, deleted, and restored from normalized records.

### U6. Inspector Framework and Type-Specific Forms

Requirements: R5, R6, R7, R8, R10, R14, R15, R16, R17, R18  
Files:

- `apps/frontend/src/components/canvas/canvas-inspector.tsx`
- `apps/frontend/src/components/canvas/business-node-form.tsx`
- `apps/frontend/src/components/canvas/business-node-inspector-sections.tsx`
- `apps/frontend/src/components/canvas/canvas-inspector.test.tsx`
- `apps/frontend/src/components/canvas/project-canvas-workspace.tsx`
- `apps/frontend/src/components/workbench-shell.tsx`
- `apps/frontend/src/app/globals.css`

Work:

- Replace the static Inspector slot with a selection-aware canvas Inspector while preserving the asset library.
- Support empty, single business node, multi-selection, unsupported selection, and error states.
- Add common editable fields: title and status.
- Add Shot form fields for visual description, action, camera movement, duration, prompt notes, and negative prompt notes.
- Add Character form fields for name, role, appearance, personality, wardrobe, and consistency prompt.
- Add Location form fields for name, environment, mood, visual style, and consistency prompt.
- Add concise forms for Novel, SceneFrame, Scene, Image, Video, and EditorPackage nodes.
- Save updates to backend first, then update local node state and selected shape props.

Tests:

- Inspector renders the correct state for empty, multi-selection, unsupported, and single business node selections.
- Shot visual description edit calls update API, updates local data, and updates card summary.
- Character and Location forms persist their core fields.
- Asset library remains visible/usable alongside the Inspector.
- Save failure leaves a visible error and does not mark the form as saved.

Exit:

- Selecting a business node shows a meaningful form and edits survive reload.

### U7. Integration Verification and Documentation

Requirements: R18 and all acceptance examples  
Files:

- `docs/development.md`
- `docs/plans/2026-06-12-004-feat-business-canvas-nodes-inspector-plan.md`
- Potentially `docs/infinite-canvas-video-long-task-development-flow.md` only if workflow rules need clarification.

Work:

- Run targeted tests after each implementation unit.
- Run full repository checks after integration:
  - `pnpm run format:check`
  - `pnpm run test`
  - `pnpm run build`
  - `pnpm run mock:workflow`
- Start local backend/frontend against Docker services and run browser verification.
- Browser acceptance script:
  - create or open a project canvas
  - create each Phase 3 MVP business node type
  - edit a Shot visual description in the Inspector
  - move or resize the Shot node
  - refresh and verify the card plus Inspector data are restored
  - delete a business node and verify it does not return after refresh
  - upload or retain an asset and verify asset library behavior remains available
  - check browser console for errors
- Update this plan status, verification evidence, and any deferred items.

Exit:

- Phase 3 acceptance examples are demonstrated.
- The working tree contains only intentional Phase 3 changes.

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| tldraw v5 custom shape API differs from examples | Shape utilities fail typecheck | Verify imports against installed `tldraw@5.1.0`; keep shape code isolated in one utility file. |
| Shape snapshot and normalized node drift | Reload may restore stale titles or geometry | Reconcile normalized nodes after snapshot load and update shape props from `CanvasNode` records. |
| Duplicate creates two shapes for one business node | Later edge/generation modules become ambiguous | Prefer normalized duplicate creation; otherwise block or visibly defer duplicate for business shapes. |
| Delete succeeds in tldraw but fails on backend | UI can lie about durable state | Surface error and force reload/recovery path; add tests for failure state. |
| Inspector forms become too broad | Module becomes hard to review | Keep Phase 3 to core fields, especially proving Shot, Character, and Location richness. |
| Geometry patch races with snapshot autosave | Save status becomes confusing | Keep geometry status visible in node sync errors; do not mark failed geometry as saved. |
| Current shell Node is below repo engine | Commands warn and future tools may fail | Keep Node 26 target unchanged; if a command truly needs it, upgrade local Node rather than lowering repo requirements. |

## Validation Plan

Targeted:

- `pnpm --filter @guga-flow/shared-types run test`
- `pnpm --filter @guga-flow/backend run test -- src/canvas/canvas.service.spec.ts`
- `pnpm --filter @guga-flow/backend run test:e2e`
- `pnpm --filter @guga-flow/frontend run test -- src/components/canvas`
- `pnpm --filter @guga-flow/frontend run lint`

Full:

- `pnpm run format:check`
- `pnpm run test`
- `pnpm run build`
- `pnpm run mock:workflow`

Manual/browser:

- Use local Docker services, backend dev server, and frontend dev server.
- Verify all AE1-AE6 flows in a browser.
- Capture project id, changed Shot text, backend node count, and console error check in the plan verification section.

## Commit Boundaries

- Commit after U1/U2 if shared contracts and backend CRUD are complete and verified.
- Commit after U3/U4 if frontend API helpers and custom shape rendering are complete and verified.
- Commit after U5/U6 if creation, sync, deletion, and Inspector are complete and verified.
- Commit after U7, code review fixes, and compound documentation.

These boundaries satisfy the module-level request to commit completed major units while keeping each commit reviewable.

## Deferred Implementation Unknowns

- Exact tldraw duplicate interception API. Resolve during U5 after inspecting installed types and examples.
- Whether selection tracking should be owned by `CanvasEditor` state or a dedicated hook. Resolve in U5 based on the cleanest test seam.
- Whether Inspector saves on blur or explicit submit. Resolve in U6; explicit submit is acceptable if it keeps failure handling clearer.
- Whether Phase 3 needs a separate node detail GET route. Initial plan uses `GET /canvas` plus mutation responses because the current canvas load already returns nodes.

## Confidence Check

Confidence: Medium-high.

The backend model already contains the needed normalized tables and cascade behavior, and Phase 2 provides durable snapshot load/save. The main risk is tldraw custom-shape and store-listener details in v5; the plan isolates that risk in U4/U5 and requires typecheck plus browser verification before the module is considered complete.

## Plan Review

- Product scope stays within the Phase 3 requirements and does not pull in edges, storyboard import, generation jobs, or providers.
- Each behavior-bearing unit lists files and tests.
- All paths are repo-relative.
- Risky sync points are covered by tests and browser acceptance.
- The Node engine warning is handled as an environment issue to fix by upgrading Node, not by lowering project architecture.
