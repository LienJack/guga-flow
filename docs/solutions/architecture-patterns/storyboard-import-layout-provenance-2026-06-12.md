---
title: "Import Storyboards Through a Provenanced Canvas Graph Plan"
date: 2026-06-12
category: architecture-patterns
module: phase-6-storyboard-import-layout
problem_type: architecture_pattern
component: storyboard_import
severity: medium
applies_when:
  - "Importing validated storyboard drafts into canvas nodes"
  - "Creating semantic graph edges from generated storyboard references"
  - "Adding repeated import behavior before overwrite/update UX exists"
  - "Testing canvas layout without depending on browser rendering"
related_components:
  - shared_types
  - backend_canvas_api
  - frontend_workbench
  - provider_contracts
tags:
  - storyboard
  - canvas-graph
  - layout
  - provenance
  - semantic-edges
---

# Import Storyboards Through a Provenanced Canvas Graph Plan

## Context

Phase 6 turns a ready `StoryboardDraft` into durable canvas graph state. The
important constraint is that imported canvas content must be usable by later
prompt and generation modules, not just visible in tldraw. Business facts
therefore belong in `CanvasNode` and `CanvasEdge` records; tldraw shapes and
arrows remain projections.

The module also needs safe repeated import behavior. MVP does not have an
overwrite or update-in-place workflow, but users still need to rerun the mock
flow. Repeated import must create a distinguishable new version without moving
or deleting earlier canvas work.

## Guidance

Build a shared import plan before touching persistence. The plan should:

- map Storyboard temp ids to stable plan keys;
- produce deterministic node geometry for Novel, Character, Location,
  SceneFrame, Scene, and Shot nodes;
- carry node data needed downstream, including image prompt, video prompt,
  duration, visual/action/camera fields, and temp references;
- produce semantic edge plans for Character, Location, and Scene membership;
- expose rectangle overlap helpers so layout can be tested without tldraw.

Use `storyboardImport` provenance inside imported node and edge `dataJson` for
the MVP. Include batch id, draft id, novel id, entity kind, source temp ids,
and version. This is enough for duplicate detection, later cleanup/migration,
and browser/UI confirmation while avoiding a premature import-batch table.

Backend import should be server-owned and transactional:

- revalidate the stored ready draft;
- reject missing, invalid, non-ready, cross-project, or unsupported duplicate
  policy requests before mutation;
- create new Novel/SceneFrame/Scene/Shot nodes for each import;
- reuse matching Character/Location nodes only when name plus role/type
  semantics match;
- create `references_character`, `references_location`, and
  `belongs_to_scene` edges;
- update Shot `characterAssetIds` and `locationAssetId` through the same
  semantic edge sync path used by manual binding.

Frontend import should call the Canvas import API and merge returned
CanvasNode/CanvasEdge records into workspace state. Let `CanvasEditor`
reconcile those records into business shapes and semantic arrows, then request
fit-to-content after reconciliation.

Imported storyboards can make the saved tldraw snapshot larger than the
Express default JSON body limit. Configure backend request body parsing with a
limit large enough for imported boards and include post-import snapshot
autosave in browser smoke. A successful import whose graph rows persist but
whose visual snapshot cannot save still feels broken to the creator.

## Why This Matters

This keeps four responsibilities separate:

- `StoryboardDraft` remains the validated source artifact.
- The shared import plan owns deterministic mapping and layout.
- The backend Canvas import route owns durable graph mutation and duplicate
  policy.
- The frontend owns user confirmation, graph refresh, and viewport fit.

Without this split, import logic can drift into the browser, tldraw snapshot
state can become the hidden source of business truth, repeated imports can
overwrite user work, or later prompt/generation modules can lose the
Character/Location relationships they need.

## When to Apply

- Adding overwrite/update-in-place import behavior.
- Building Phase 7 Prompt Composer from imported Shot and asset references.
- Creating cleanup tools for old storyboard import batches.
- Adding browser smoke for large imported storyboards.
- Migrating imported graph data into a first-class import batch table later.

## Regression Tests

Keep coverage at each boundary:

- shared layout tests for two scenes and six shots with no rectangle overlap;
- shared provenance tests for import detection;
- backend service tests for ready gating, transaction behavior, repeated
  versioning, asset reuse, and semantic edge creation;
- backend e2e tests for Novel -> Storyboard -> Ready -> Canvas import ->
  Canvas reload;
- frontend helper tests for importable state, repeated-import detection,
  summary formatting, and graph merge;
- browser smoke that imports from the workbench panel and confirms the board is
  visible after fit-to-content;
- browser smoke that confirms post-import `PATCH /canvas/snapshot` succeeds and
  the topbar returns to `Saved`.

## Related

- [Keep Storyboard Drafts Validated Before Canvas Import](./storyboard-draft-validation-import-boundary-2026-06-12.md)
- [Project Semantic Canvas Edges Into tldraw Arrows](./semantic-canvas-edge-projection-lifecycle-2026-06-12.md)
- [Keep tldraw Business Shapes Synchronized With Normalized Canvas Nodes](./tldraw-business-shape-normalized-node-sync-2026-06-12.md)
- [Phase 6 implementation plan](../../plans/2026-06-12-007-feat-storyboard-import-layout-plan.md)
