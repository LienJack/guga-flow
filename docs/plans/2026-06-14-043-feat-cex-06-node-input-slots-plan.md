---
title: feat: Complete CEX-06 node input slots
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-043-cex-06-node-input-slots-requirements.md
---

# feat: Complete CEX-06 Node Input Slots

## Summary

Add a shared canvas input-slot policy layer and use it from frontend and backend
edge creation so compatible upstream media references are explicit, ordered, and
count-limited.

## Scope Boundaries

- No replacement of existing edge relations.
- No AI text/audio execution.
- No migration of old edges.
- No provider-specific model probing beyond readable policy errors.

## Requirements Trace

- R1/R2 -> U1 shared slot policy contracts and tests.
- R3 -> U2 frontend edge-data slot metadata and tests.
- R4/R5/R6 -> U3 backend validation and persistence tests.
- AE1-AE5 -> U4 verification, browser smoke if practical, solution doc, commit.

## Implementation Units

- U1. **Shared input-slot policy**
  - Define input kinds, roles, policy shape, edge data fields, and validation
    helpers.
  - Add policies for current source media, business, image, and video nodes.
  - Add shared tests for compatibility and count failures.

- U2. **Frontend slot-aware edge creation**
  - Resolve source/target pairs into slot metadata.
  - Include `slotId`, `inputKind`, `inputRole`, and `order` in `dataJson`.
  - Keep semantic character/location relation behavior unchanged.
  - Add canvas edge/semantic interaction tests.

- U3. **Backend second-pass validation**
  - Validate source/target compatibility and per-slot count before edge write.
  - Preserve same-canvas-page validation.
  - Add tests for valid source media references, type mismatch, and count
    overflow.

- U4. **Validation and learning capture**
  - Run shared/backend/frontend checks plus workspace lint/test.
  - Browser smoke a compatible source-media edge if practical.
  - Capture a solution doc for slot policy boundaries.
  - Commit the completed module.

## Verification Targets

- `pnpm --filter @guga-flow/shared-types run lint`
- `pnpm --filter @guga-flow/shared-types test`
- `pnpm --filter @guga-flow/shared-types run build`
- `pnpm --filter @guga-flow/backend run lint`
- `pnpm --filter @guga-flow/backend test`
- `pnpm --filter @guga-flow/frontend run lint`
- `pnpm --filter @guga-flow/frontend test`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3012/api/v1 pnpm --dir apps/frontend exec next build`
- `pnpm -r lint`
- `pnpm -r test`
