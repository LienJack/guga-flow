---
title: feat: Complete CEX-04 multimodal node taxonomy
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-041-cex-04-node-taxonomy-requirements.md
---

# feat: Complete CEX-04 Multimodal Node Taxonomy

## Summary

Add a shared canvas node registry with family and capability metadata, then project that metadata into business node definitions, cards, and the creation toolbar so future source media, AI generation, media operation, helper, and advanced visual slices have a typed foundation.

## Scope Boundaries

- Do not add new persisted node types for source media or advanced visual nodes in this slice.
- Do not add drag/drop import, media upload, node input slots, or backend connection validation.
- Do not change `CanvasNodeRecord` persistence or tldraw shape schema.
- Do not copy AI-CanvasPro implementation details.

## Requirements Trace

- R1/R2/R3 -> U1 shared node registry and tests.
- R4/R6 -> U2 frontend node definition/card metadata.
- R5 -> U3 grouped node toolbar.
- AE1-AE4 -> U4 verification and learning capture.

## Implementation Units

- U1. **Shared node taxonomy registry**
  - Add `CanvasNodeFamily`, `CanvasNodeCapability`, registry item types, constants, and helper functions in `packages/shared-types/src/domain/canvas.ts`.
  - Registry must cover every current `CanvasNodeType`, including retained non-Phase-3 types such as `style_asset`, `prop_asset`, and `note`.
  - Extend shared domain tests to verify registry coverage and capability validity.

- U2. **Frontend node metadata projection**
  - Extend `BusinessNodeDefinition` to include family, capabilities, and family label derived from the shared registry.
  - Keep defaults/card summary behavior unchanged.
  - Add tests proving Phase 3 definitions mirror shared registry metadata.

- U3. **Grouped creation toolbar and visible metadata**
  - Update `BusinessNodeToolbar` to group create buttons by family.
  - Add lightweight card metadata for family/capability status so users can distinguish business, AI generation, media operation, and helper nodes.
  - Add render tests for grouped headings and metadata.

- U4. **Validation and learning capture**
  - Run shared/frontend focused lint and tests plus workspace lint/test as needed.
  - Browser smoke the canvas toolbar/card surface if practical.
  - Capture a solution doc for node taxonomy registry boundaries.
  - Commit the completed module.

## Verification Targets

- `pnpm --filter @guga-flow/shared-types run lint`
- `pnpm --filter @guga-flow/shared-types test`
- `pnpm --filter @guga-flow/shared-types run build`
- `pnpm --filter @guga-flow/frontend run lint`
- `pnpm --filter @guga-flow/frontend test`
- `pnpm -r lint`
- `pnpm -r test`
- Browser smoke: canvas/workbench renders grouped node taxonomy affordances without console errors.
