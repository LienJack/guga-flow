---
title: feat: Complete CEX-05 source media drag drop
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-042-cex-05-source-media-drag-drop-requirements.md
---

# feat: Complete CEX-05 Source Media Drag Drop

## Summary

Add typed source media canvas nodes and a drag/drop path that uploads dropped
files as Assets before creating durable canvas nodes referencing those assets.

## Scope Boundaries

- No schema migration; source metadata lives in `CanvasNode.dataJson`.
- No remote URL import, folder import, media probing, or thumbnail generation.
- No CEX-06 slot/cardinality validation.
- No browser-only raw file storage beyond the in-flight upload request.

## Requirements Trace

- R1/R2 -> U1 shared source node contracts and registry coverage.
- R4/AE4 -> U2 backend create validation and source-node persistence tests.
- R3/R4/R5/R6 -> U3 frontend drag/drop creation and render tests.
- AE1-AE4 -> U4 verification, browser smoke, solution capture, commit.

## Implementation Units

- U1. **Shared source media contracts**
  - Add `source_text`, `source_image`, `source_video`, and `source_audio`.
  - Add source node data types and registry entries under `source_media`.
  - Include source nodes in the renderable canvas node type list.
  - Extend shared domain tests.

- U2. **Backend create-node acceptance**
  - Ensure Canvas create validation accepts source node types through the shared
    renderable node list.
  - Add service/controller tests for creating a source node with Asset metadata.

- U3. **Frontend source node creation UX**
  - Add source node definitions, shape types, toolbar grouping, and card
    summaries/details.
  - Add a drag/drop helper that validates files, rejects duplicate batch files,
    uploads via `uploadAsset`, and creates source nodes at the drop point.
  - Surface readable errors for unsupported, duplicate, upload, and node-create
    failures.
  - Add focused unit/render tests.

- U4. **Validation and learning capture**
  - Run shared/backend/frontend checks plus workspace lint/test.
  - Browser smoke canvas drag/drop with a mock API if practical.
  - Capture a solution doc for durable source media node import.
  - Commit the completed module.

## Verification Targets

- `pnpm --filter @guga-flow/shared-types run lint`
- `pnpm --filter @guga-flow/shared-types test`
- `pnpm --filter @guga-flow/shared-types run build`
- `pnpm --filter @guga-flow/backend run lint`
- `pnpm --filter @guga-flow/backend test`
- `pnpm --filter @guga-flow/frontend run lint`
- `pnpm --filter @guga-flow/frontend test`
- `pnpm -r lint`
- `pnpm -r test`
- Browser smoke: dropped source files create Asset-backed source nodes with no
  console errors.
